import { encryptSecret, decryptSecret } from "../../lib/inventory-crypto.js";

const SENSITIVE_TYPES = new Set(["password"]);

function packSecret(value) {
  if (value === undefined) return undefined;
  const text = value === null || value === "" ? null : String(value);
  if (!text) return { enc: null, iv: null, tag: null, value: null };
  const { encrypted, iv, authTag } = encryptSecret(text);
  return { enc: encrypted, iv, tag: authTag, value: null };
}

function unpackSecret(enc, iv, tag) {
  if (!enc || !iv || !tag) return null;
  return decryptSecret(enc, iv, tag);
}

function decodeField(field) {
  const value = SENSITIVE_TYPES.has(field.type)
    ? unpackSecret(field.valueEnc, field.valueIv, field.valueTag)
    : field.value ?? null;
  return {
    id: field.id,
    label: field.label,
    type: field.type,
    value,
  };
}

function encodeField(field) {
  const base = {
    id: String(field.id),
    label: String(field.label ?? "").trim(),
    type: field.type,
  };
  if (SENSITIVE_TYPES.has(field.type)) {
    const packed = packSecret(field.value);
    return {
      ...base,
      value: null,
      valueEnc: packed.enc,
      valueIv: packed.iv,
      valueTag: packed.tag,
    };
  }
  return {
    ...base,
    value: field.value == null || field.value === "" ? null : String(field.value),
    valueEnc: null,
    valueIv: null,
    valueTag: null,
  };
}

function encodeFields(fields) {
  return (fields ?? []).map(encodeField);
}

function legacyFieldsFromRow(row) {
  const fields = [];
  const push = (id, label, type, value) => {
    if (value != null && String(value).trim() !== "") {
      fields.push({ id, label, type, value: String(value) });
    }
  };

  push("legacy-figma", "Figma link", "url", row.figmaLink);
  if (row.serverType) {
    push(
      "legacy-server-type",
      "Server type",
      "text",
      row.serverType === "client_server" ? "Client server" : "Company server",
    );
  }
  push("legacy-server-host", "Server host", "text", row.serverHost);
  push("legacy-server-user", "Server username", "text", row.serverUser);
  push(
    "legacy-server-password",
    "Server password",
    "password",
    unpackSecret(row.serverPasswordEnc, row.serverPasswordIv, row.serverPasswordTag),
  );
  push("legacy-server-notes", "Server notes", "textarea", row.serverNotes);
  push("legacy-firebase-email", "Firebase email", "text", row.firebaseEmail);
  push(
    "legacy-firebase-password",
    "Firebase password",
    "password",
    unpackSecret(row.firebasePasswordEnc, row.firebasePasswordIv, row.firebasePasswordTag),
  );
  push("legacy-firebase-project", "Firebase project ID", "text", row.firebaseProjectId);
  push(
    "legacy-maps-key",
    "Google Maps API key",
    "password",
    unpackSecret(row.googleMapsApiKeyEnc, row.googleMapsApiKeyIv, row.googleMapsApiKeyTag),
  );
  push("legacy-keystore", "Play Store keystore", "file", row.playStoreKeystoreUrl);
  push("legacy-store-key", "Play Store key", "file", row.playStoreKeyUrl);
  push("legacy-source", "Source code archive", "file", row.sourceCodeUrl);
  push("legacy-notes", "Additional notes", "textarea", row.extraNotes);

  for (const [i, img] of (row.images ?? []).entries()) {
    if (img?.url) {
      fields.push({
        id: `legacy-image-${i}`,
        label: img.caption?.trim() || `Screenshot ${i + 1}`,
        type: "image",
        value: img.url,
      });
    }
  }

  return fields;
}

function resolveFields(row) {
  if ((row.fields ?? []).length) {
    return row.fields.map(decodeField);
  }
  return legacyFieldsFromRow(row);
}

const DAY_MS = 86_400_000;
const REMINDER_WINDOW_DAYS = 15;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysUntilEnd(endDate) {
  if (!endDate) return null;
  const end = startOfDay(endDate);
  const today = startOfDay(new Date());
  return Math.round((end.getTime() - today.getTime()) / DAY_MS);
}

function renewalToDto(renewal) {
  const endDate = renewal.endDate instanceof Date ? renewal.endDate : new Date(renewal.endDate);
  const startDate = renewal.startDate instanceof Date ? renewal.startDate : new Date(renewal.startDate);
  return {
    id: renewal.id,
    kind: renewal.kind,
    label: renewal.label ?? "",
    provider: renewal.provider ?? null,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    notes: renewal.notes ?? null,
    daysUntilExpiry: daysUntilEnd(endDate),
  };
}

function computeNearestRenewal(renewals) {
  const upcoming = (renewals ?? [])
    .map(renewalToDto)
    .filter((r) => r.daysUntilExpiry != null && r.daysUntilExpiry <= REMINDER_WINDOW_DAYS)
    .sort((a, b) => (a.daysUntilExpiry ?? 0) - (b.daysUntilExpiry ?? 0));
  return upcoming[0] ?? null;
}

function rowToDto(row) {
  if (!row) return null;
  const fields = resolveFields(row);
  const renewals = (row.renewals ?? []).map(renewalToDto);
  return {
    id: row.id,
    projectId: row.projectId,
    fields,
    renewals,
    nearestRenewal: computeNearestRenewal(row.renewals),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function computeCompleteness(dto) {
  const fields = dto?.fields ?? [];
  if (!fields.length) return { filled: 0, total: 0, percent: 0 };
  const filled = fields.filter((f) => f.value != null && String(f.value).trim() !== "").length;
  return {
    filled,
    total: fields.length,
    percent: Math.round((filled / fields.length) * 100),
  };
}

export {
  encodeFields,
  decodeField,
  rowToDto,
  computeCompleteness,
  computeNearestRenewal,
  renewalToDto,
  daysUntilEnd,
  startOfDay,
  REMINDER_WINDOW_DAYS,
  SENSITIVE_TYPES,
};
