import mongoose from "mongoose";
import { logger } from "./logger.js";

/**
 * MongoDB transactions require a replica set (or a sharded cluster). A bare
 * `mongod` instance — which is what the local dev `.mongo-data/` setup uses —
 * rejects `session.startTransaction()` with code 20 ("Transaction numbers
 * are only allowed on a replica set member or mongos").
 *
 * Production uses MongoDB Atlas (replica set), so transactions work there.
 *
 * Strategy:
 *   - Run the body inside `connection.transaction(fn)` when possible.
 *   - If the server refuses transactions, run the body once WITHOUT a session
 *     and emit a single warning the first time it happens. This keeps dev
 *     ergonomics tolerable without silently masking the production behavior.
 *
 * IMPORTANT: callers must thread `session` through every Mongoose write
 * (e.g. `Model.updateOne(filter, update, { session })`). When the dev
 * fallback kicks in, `session` is `null` — Mongoose treats `{ session: null }`
 * exactly like no option, so call sites do not need branching.
 */

let _txSupported = null;
let _warnedAboutFallback = false;

function isStandaloneError(err) {
  if (!err) return false;
  if (err.code === 20) return true;
  if (err.codeName === "IllegalOperation") return true;
  const msg = String(err.message ?? "");
  return (
    msg.includes("Transaction numbers are only allowed on a replica set") ||
    msg.includes("not supported on standalone")
  );
}

async function detectTransactionSupport() {
  if (_txSupported !== null) return _txSupported;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    await session.abortTransaction();
    _txSupported = true;
  } catch (err) {
    if (isStandaloneError(err)) {
      _txSupported = false;
    } else {
      // Some unrelated failure — assume supported; the real call will surface the error.
      _txSupported = true;
    }
  } finally {
    await session.endSession();
  }
  return _txSupported;
}

/**
 * Run `fn(session)` inside a MongoDB transaction. Falls back to running
 * without a session on standalone mongod (dev only — warns once).
 *
 * Returns whatever `fn` returns.
 *
 * Usage:
 *
 *   await runInTx(async (session) => {
 *     await LeaveBalances.updateOne({ id }, inc, { session });
 *     await LeaveRequests.updateOne({ id: reqId }, set, { session });
 *   });
 *
 * Note: `connection.transaction(fn)` auto-retries on `TransientTransactionError`
 * and `UnknownTransactionCommitResult`. We rely on that.
 */
export async function runInTx(fn) {
  const supported = await detectTransactionSupport();

  if (!supported) {
    if (!_warnedAboutFallback) {
      logger.warn(
        "runInTx: MongoDB transactions are not supported by this server (standalone mongod). " +
          "Running without transactional isolation. This is acceptable in local dev but production " +
          "MUST use a replica set so multi-document writes are atomic.",
      );
      _warnedAboutFallback = true;
    }
    return fn(null);
  }

  return mongoose.connection.transaction(async (session) => fn(session));
}

/** Test-only: reset cached transaction-support flag (e.g. between describe blocks). */
export function _resetTransactionSupportCacheForTests() {
  _txSupported = null;
  _warnedAboutFallback = false;
}
