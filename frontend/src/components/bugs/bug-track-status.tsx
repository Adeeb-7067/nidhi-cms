import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  canSetDevStatus,
  canSetFinalStatus,
  canSetQaStatus,
  FINAL_STATUS_LABELS,
  normalizeFinalStatus,
  normalizeTrackStatus,
  TRACK_STATUS_LABELS,
  type FinalStatus,
  type TrackStatus,
} from "@/lib/bug-workflow";

function TrackToggle({
  label,
  value,
  disabled,
  onChange,
  options,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (v: TrackStatus | FinalStatus) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as TrackStatus & FinalStatus)}
        className="flex-1 grid grid-cols-2 h-8 bg-muted/40 p-0.5 rounded-md"
        disabled={disabled}
      >
        {options.map((opt) => (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            className="text-[10px] h-7 rounded-sm data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export function BugTrackStatusRow({
  qaStatus,
  devStatus,
  finalStatus,
  userRole,
  isAssignee,
  onQaChange,
  onDevChange,
  onFinalChange,
  disabled,
  compact,
  initialCreate,
  className,
}: {
  qaStatus?: string;
  devStatus?: string;
  finalStatus?: string;
  userRole?: string;
  isAssignee?: boolean;
  onQaChange?: (v: TrackStatus) => void;
  onDevChange?: (v: TrackStatus) => void;
  onFinalChange?: (v: FinalStatus) => void;
  disabled?: boolean;
  compact?: boolean;
  /** Reporters may set all tracks when creating */
  initialCreate?: boolean;
  className?: string;
}) {
  const qa = normalizeTrackStatus(qaStatus);
  const dev = normalizeTrackStatus(devStatus);
  const fin = normalizeFinalStatus(finalStatus);

  const reporterCreate = initialCreate && canSetQaStatus(userRole);
  const qaEditable = !!onQaChange && (canSetQaStatus(userRole) || reporterCreate);
  const devEditable =
    !!onDevChange && (canSetDevStatus(userRole, isAssignee) || reporterCreate);
  const finEditable = !!onFinalChange && (canSetFinalStatus(userRole) || reporterCreate);

  const trackOpts = [
    { value: "open", label: TRACK_STATUS_LABELS.open },
    { value: "fixed", label: TRACK_STATUS_LABELS.fixed },
  ];
  const finalOpts = [
    { value: "open", label: FINAL_STATUS_LABELS.open },
    { value: "resolved", label: FINAL_STATUS_LABELS.resolved },
  ];

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-2.5 rounded-lg border border-border/50 p-3 bg-muted/20", className)}>
      <TrackToggle
        label="QA"
        value={qa}
        disabled={disabled || !qaEditable}
        onChange={(v) => onQaChange?.(v as TrackStatus)}
        options={trackOpts}
      />
      <TrackToggle
        label="Dev"
        value={dev}
        disabled={disabled || !devEditable}
        onChange={(v) => onDevChange?.(v as TrackStatus)}
        options={trackOpts}
      />
      <TrackToggle
        label="Final"
        value={fin}
        disabled={disabled || !finEditable}
        onChange={(v) => onFinalChange?.(v as FinalStatus)}
        options={finalOpts}
      />
    </div>
  );
}

export function BugTrackStatusBadges({
  qaStatus,
  devStatus,
  finalStatus,
  className,
}: {
  qaStatus?: string;
  devStatus?: string;
  finalStatus?: string;
  className?: string;
}) {
  const qa = normalizeTrackStatus(qaStatus);
  const dev = normalizeTrackStatus(devStatus);
  const fin = normalizeFinalStatus(finalStatus);

  const pill = (label: string, ok: boolean) => (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border",
        ok
          ? "bg-green-500/10 text-green-700 border-green-500/30"
          : "bg-muted/50 text-muted-foreground border-border/60",
      )}
    >
      {label}: {ok ? "✓" : "—"}
    </span>
  );

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {pill("QA", qa === "fixed")}
      {pill("Dev", dev === "fixed")}
      {pill("Final", fin === "resolved")}
    </div>
  );
}
