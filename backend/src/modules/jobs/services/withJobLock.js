import os from "node:os";
import { jobRunsTable, getNextSequence } from "../../../models/schema/index.js";
import { logger } from "../../../lib/logger.js";

/**
 * Cross-process dedup for recurring jobs.
 *
 * Two attempts to lock the same (jobName, periodKey) cannot both succeed:
 * the second insert fails on the unique index and we treat it as
 * `alreadyRan` (or `inProgress` if the prior attempt is still running).
 *
 * Usage:
 *
 *   const outcome = await withJobLock("hrm_accrual", "2026-06", async (ctx) => {
 *     // ... idempotent body, free to throw on failure ...
 *     return { credited: 42 };
 *   });
 *
 *   outcome.status === "ran"          → fn ran successfully, outcome.result is its return value
 *   outcome.status === "skipped"      → another run already finished for this period
 *   outcome.status === "in_progress"  → another process is still running for this period
 *   outcome.status === "failed"       → fn threw; outcome.error has the message
 *
 * The lock row is upgraded in-place to succeeded/failed and is NEVER deleted,
 * which is what makes the dedup durable across process restarts.
 */
export async function withJobLock(jobName, periodKey, fn) {
  if (!jobName || !periodKey) {
    throw new Error("withJobLock: jobName and periodKey are required");
  }

  let lockRow;
  try {
    const id = await getNextSequence("job_runs");
    lockRow = await jobRunsTable.create({
      id,
      jobName,
      periodKey,
      status: "running",
      startedAt: new Date(),
      hostname: os.hostname(),
      pid: process.pid,
    });
  } catch (err) {
    if (err?.code === 11000) {
      const existing = await jobRunsTable.findOne({ jobName, periodKey }).lean();
      if (existing?.status === "succeeded") {
        return { status: "skipped", reason: "already_ran", existing };
      }
      if (existing?.status === "running") {
        return { status: "in_progress", existing };
      }
      // existing.status === "failed" — caller can retry by passing a different periodKey
      // (e.g. "2026-06" vs. "2026-06:retry-1"). We do NOT auto-retry failed jobs to
      // avoid silently masking real bugs.
      return { status: "skipped", reason: "previous_attempt_failed", existing };
    }
    throw err;
  }

  try {
    const result = await fn({ lockId: lockRow.id, jobName, periodKey });
    await jobRunsTable.updateOne(
      { id: lockRow.id },
      {
        $set: {
          status: "succeeded",
          finishedAt: new Date(),
          result: result ?? null,
        },
      },
    );
    return { status: "ran", result, lockId: lockRow.id };
  } catch (err) {
    const message = err?.message ?? String(err);
    await jobRunsTable.updateOne(
      { id: lockRow.id },
      {
        $set: {
          status: "failed",
          finishedAt: new Date(),
          error: message.slice(0, 1000),
        },
      },
    );
    logger.error({ err, jobName, periodKey }, "Job lock body threw");
    return { status: "failed", error: message, lockId: lockRow.id };
  }
}

/**
 * Look up whether a (jobName, periodKey) has succeeded. Cheap idempotency
 * check before doing any work (useful for jobs that schedule themselves
 * many times per period for resilience).
 */
export async function hasJobRun(jobName, periodKey) {
  const row = await jobRunsTable.findOne({ jobName, periodKey, status: "succeeded" }).lean();
  return Boolean(row);
}
