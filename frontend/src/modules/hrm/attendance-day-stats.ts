import { isPresentLikeStatus } from "./constants";
import type { HrmAttendanceSummary } from "./types";
import type { HrmDashboardOnLeavePerson } from "./types";

const TODAY_STATUS_LABELS: Record<string, string> = {
  present: "Present",
  onsite: "Late",
  wfh: "WFH",
  absent: "Absent",
  scheduled: "Scheduled",
  on_leave: "On leave",
  half_day: "Half day",
};

function isScheduledGlobalWfh(s: HrmAttendanceSummary) {
  return s.globalWfh === true && s.status === "absent";
}

export type TodayAttendanceDerived = {
  present: number;
  absent: number;
  onLeave: number;
  wfh: number;
  halfDay: number;
  workingCount: number;
  pipelineStages: Array<{ label: string; value: number }>;
  onLeaveToday: HrmDashboardOnLeavePerson[];
  onWfhToday: HrmDashboardOnLeavePerson[];
};

/** Derive today's KPI + chart slices from the same summaries as the Attendance grid. */
export function deriveTodayAttendanceStats(
  summaries: HrmAttendanceSummary[],
): TodayAttendanceDerived {
  const working = summaries.filter((s) => !["weekend", "holiday"].includes(s.status));

  const present = working.filter((s) => isPresentLikeStatus(s.status)).length;
  const scheduled = working.filter(isScheduledGlobalWfh).length;
  const absent = working.filter((s) => s.status === "absent" && !isScheduledGlobalWfh(s)).length;
  const onLeave = working.filter((s) => s.status === "on_leave").length;
  const wfh = working.filter((s) => s.status === "wfh").length;
  const halfDay = working.filter((s) => s.status === "half_day").length;

  const counts: Record<string, number> = {
    present: 0,
    onsite: 0,
    wfh: 0,
    scheduled: 0,
    absent: 0,
    on_leave: 0,
    half_day: 0,
  };

  for (const s of working) {
    if (isScheduledGlobalWfh(s)) {
      counts.scheduled += 1;
      continue;
    }
    const key = s.status === "late" ? "onsite" : s.status;
    if (counts[key] != null) counts[key] += 1;
  }

  const pipelineStages = Object.entries(counts)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      label: TODAY_STATUS_LABELS[key] ?? key,
      value,
    }));

  const toPerson = (s: HrmAttendanceSummary): HrmDashboardOnLeavePerson => ({
    userId: s.userId,
    userName: s.userName,
    employeeId: s.employeeId ?? null,
    avatarUrl: null,
  });

  return {
    present,
    absent,
    onLeave,
    wfh,
    halfDay,
    workingCount: working.length,
    pipelineStages,
    onLeaveToday: working.filter((s) => s.status === "on_leave").map(toPerson),
    onWfhToday: working.filter((s) => s.status === "wfh").map(toPerson),
  };
}
