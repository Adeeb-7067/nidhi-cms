/** Calendar day for a daily log entry (work date, not created/updated timestamp). */
export function formatDailyLogWorkDate(logDate: string): string {
  const iso = String(logDate).slice(0, 10);
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Secondary line for tables: when the log entry was last saved. */
export function formatDailyLogUpdatedLabel(logDate: string, updatedAt: string): string {
  const updated = new Date(updatedAt);
  if (Number.isNaN(updated.getTime())) return "";

  const logDay = String(logDate).slice(0, 10);
  const updatedDay = updated.toISOString().slice(0, 10);
  const time = updated.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (logDay === updatedDay) {
    return `Updated ${time}`;
  }

  return `Updated ${updated.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}
