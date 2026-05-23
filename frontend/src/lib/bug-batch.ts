import {
  normalizeFinalStatus,
  normalizeTrackStatus,
  type FinalStatus,
  type TrackStatus,
} from "@/lib/bug-workflow";

export const MAX_BATCH_BUGS = 50;

export type BatchInputMode = "lines" | "list";

export type DraftBugRow = {
  id: string;
  title: string;
  qaStatus: TrackStatus;
  devStatus: TrackStatus;
  finalStatus: FinalStatus;
};

function rowId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function newDraftRow(title = ""): DraftBugRow {
  return {
    id: rowId(),
    title,
    qaStatus: "open",
    devStatus: "open",
    finalStatus: "open",
  };
}

export function parseLinesToRows(text: string): DraftBugRow[] {
  const lines = text.split(/\r?\n/);
  const rows: DraftBugRow[] = [];
  for (const raw of lines) {
    let line = raw.trim();
    if (!line) continue;
    line = line.replace(/^[-*•]\s+/, "");
    line = line.replace(/^\d+[.)]\s+/, "");
    if (!line) continue;
    rows.push(newDraftRow(line));
    if (rows.length >= MAX_BATCH_BUGS) break;
  }
  return rows;
}

export function rowsToLineText(rows: DraftBugRow[]): string {
  return rows.map((r) => r.title).join("\n");
}

export function buildBatchParentTitle(rows: DraftBugRow[]): string {
  const first = rows.find((r) => r.title.trim())?.title.trim() ?? "Bug report";
  if (rows.length <= 1) return first;
  return `${first} (+${rows.length - 1} more)`;
}

export function validateBatchRows(rows: DraftBugRow[]): string | null {
  if (rows.length === 0) return "Add at least one bug.";
  const empty = rows.find((r) => !r.title.trim());
  if (empty) return "Every bug needs a title.";
  if (rows.length > MAX_BATCH_BUGS) return `Maximum ${MAX_BATCH_BUGS} bugs per batch.`;
  return null;
}

export function rowsToBatchItems(rows: DraftBugRow[]) {
  return rows.map((row) => ({
    title: row.title.trim(),
    qaStatus: normalizeTrackStatus(row.qaStatus),
    devStatus: normalizeTrackStatus(row.devStatus),
    finalStatus: normalizeFinalStatus(row.finalStatus),
  }));
}
