import { CaCalendarEvents } from "../schema/calendar-events.js";
import { getNextSequence } from "../../../models/schema/index.js";
import { CA_COMPLIANCE_TIMING } from "../../../constants/ca.js";

/**
 * Keep compliance calendar in sync with filings (single due-date story).
 * sourceKey e.g. "gst-filing:12" — upsert so edits don't duplicate rows.
 */
export async function upsertCalendarFromSource({
  sourceKey,
  title,
  category,
  dueDate,
  status,
  createdBy,
  ownerName = "CA Team",
}) {
  if (!sourceKey || !title || !category || !dueDate || !createdBy) return null;

  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;

  let timing = "upcoming";
  if (status === "filed" || status === "completed") timing = "completed";
  else if (status === "overdue") timing = "overdue";
  else if (due < startOfToday()) timing = "overdue";
  else if (!CA_COMPLIANCE_TIMING.includes(timing)) timing = "upcoming";

  const existing = await CaCalendarEvents.findOne({ sourceKey, isDeleted: false }).lean();
  if (existing) {
    await CaCalendarEvents.updateOne(
      { id: existing.id },
      {
        $set: {
          title,
          category,
          dueDate: due,
          status: timing,
          ownerName,
        },
      },
    );
    return existing.id;
  }

  const id = await getNextSequence("ca_calendar_events");
  await CaCalendarEvents.create({
    id,
    title,
    category,
    dueDate: due,
    status: timing,
    ownerName,
    sourceKey,
    createdBy,
    isDeleted: false,
  });
  return id;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function filingStatusToCalendar(status) {
  if (status === "filed" || status === "completed") return "completed";
  if (status === "overdue") return "overdue";
  return "upcoming";
}
