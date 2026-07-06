import { HttpError } from "../lib/http-error.js";

const FIELD_LABELS = {
  email: "Email",
  portalEmail: "Portal login email",
  companyCode: "Company code",
  employeeId: "Employee ID",
  pairKey: "Discussion channel",
  participantIds: "Discussion channel",
  phone: "Phone number",
  number: "Document number",
  receiptNumber: "Receipt number",
};

/** Walk error.cause chain for Mongo E11000 (driver / Mongoose wrappers). */
export function findMongoDuplicateKeyError(err) {
  let current = err;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    const code = current.code;
    if (code === 11000 || code === 11001 || code === "11000" || code === "11001") {
      return current;
    }
    current = current.cause;
  }
  return null;
}

export function isMongoDuplicateKeyError(err) {
  return findMongoDuplicateKeyError(err) != null;
}

function parseDupKeyFromMessage(message) {
  if (typeof message !== "string") return {};
  const match = message.match(/dup key:\s*\{([^}]*)\}/i);
  if (!match) return {};

  const parsed = {};
  const inner = match[1];
  const fieldRegex = /([\w.]+)\s*:\s*(?:"([^"]*)"|'([^']*)'|([^,\s}]+))/g;
  let fieldMatch;
  while ((fieldMatch = fieldRegex.exec(inner)) !== null) {
    const key = fieldMatch[1];
    const value = fieldMatch[2] ?? fieldMatch[3] ?? fieldMatch[4];
    if (key && value !== undefined) parsed[key] = value;
  }
  return parsed;
}

function parseCollectionFromMessage(message) {
  if (typeof message !== "string") return null;
  const match = message.match(/collection:\s*[\w.-]+\.(\w+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function parseIndexFromMessage(message) {
  if (typeof message !== "string") return null;
  const match = message.match(/index:\s*([\w.]+)/i);
  return match?.[1] ?? null;
}

function fieldFromIndexName(indexName) {
  if (!indexName) return null;
  const base = indexName.replace(/_\d+$/, "");
  if (base.includes(".")) return base.split(".").pop();
  return base || null;
}

function apiFieldForDuplicate({ key, collection }) {
  if (key === "email") {
    return collection === "users" ? "portalEmail" : "email";
  }
  if (key === "participantIds" || key === "pairKey") return null;
  if (key === "companyCode") return "companyCode";
  if (key === "employeeId") return "employeeId";
  return key;
}

function labelForKey(key) {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

/**
 * Normalize Mongo duplicate key errors into keys, values, and collection.
 */
export function parseMongoDuplicateKeyError(err) {
  const mongoErr = findMongoDuplicateKeyError(err);
  if (!mongoErr) return null;

  const message = typeof mongoErr.message === "string" ? mongoErr.message : "";
  const keyPattern = mongoErr.keyPattern ?? {};
  let keys = Object.keys(keyPattern);
  const keyValue = { ...(mongoErr.keyValue ?? {}) };

  const parsedFromMessage = parseDupKeyFromMessage(message);
  for (const [key, value] of Object.entries(parsedFromMessage)) {
    if (!(key in keyValue)) keyValue[key] = value;
    if (!keys.includes(key)) keys.push(key);
  }

  if (keys.length === 0) {
    const indexField = fieldFromIndexName(parseIndexFromMessage(message));
    if (indexField) keys = [indexField];
  }

  return {
    keys,
    keyValue,
    collection: parseCollectionFromMessage(message),
    indexName: parseIndexFromMessage(message),
    message,
  };
}

/** User-facing duplicate message + optional form field for API responses. */
export function duplicateKeyToApiBody(err) {
  const info = parseMongoDuplicateKeyError(err);
  if (!info) {
    return {
      message: "This value is already in use. Please change it and try again.",
    };
  }

  const { keys, keyValue, collection } = info;
  const primaryKey = keys[0];

  if (keys.includes("email")) {
    const email = keyValue.email ?? parseDupKeyFromMessage(info.message).email;
    const valueHint = email ? ` "${email}"` : "";
    if (collection === "users") {
      return {
        message: `Portal login email${valueHint} is already registered to another account.`,
        field: "portalEmail",
      };
    }
    return {
      message: `Contact email${valueHint} is already used by another company. Check Customers or Companies.`,
      field: "email",
    };
  }

  if (keys.includes("companyCode")) {
    const code = keyValue.companyCode;
    if (code == null || code === "null") {
      return {
        message:
          "Could not save the company record due to a duplicate empty company code in the database. Retry after restarting the API, or contact support.",
        field: "companyCode",
      };
    }
    return {
      message: code
        ? `Company code "${code}" is already in use.`
        : "This company code is already in use.",
      field: "companyCode",
    };
  }

  if (keys.includes("employeeId")) {
    return {
      message: "This employee ID is already in use.",
      field: "employeeId",
    };
  }

  if (keys.includes("participantIds") || keys.includes("pairKey")) {
    return {
      message: "A discussion channel for these users already exists.",
    };
  }

  if (keys.length === 1 && keys[0] === "id") {
    return { message: "A record with this identifier already exists. Refresh and try again." };
  }

  if (primaryKey) {
    const label = labelForKey(primaryKey);
    const value = keyValue[primaryKey];
    const valueHint = value != null && value !== "" ? ` "${value}"` : "";
    return {
      message: `${label}${valueHint} is already in use.`,
      field: apiFieldForDuplicate({ key: primaryKey, collection }),
    };
  }

  return {
    message: "This value is already in use. Please change it and try again.",
  };
}

/** Convert a Mongo duplicate key error into an HttpError for controllers/services. */
export function duplicateKeyToHttpError(err) {
  if (!isMongoDuplicateKeyError(err)) return null;
  const body = duplicateKeyToApiBody(err);
  return new HttpError(409, body.message, {
    code: "CONFLICT",
    ...(body.field ? { field: body.field } : {}),
  });
}
