import { Input } from "@/components/ui/input";
import { MarketingAssigneeSelect } from "./MarketingAssigneeSelect";
import { useDigitalAssigneeGate } from "../use-digital-assignee-gate";

type Props = {
  accountId?: number | null;
  /** When project is known without loading accounts (e.g. Project Detail). */
  projectId?: number | null;
  value?: string;
  onValueChange: (userId: string) => void;
  placeholder?: string;
  className?: string;
  allowUnassigned?: boolean;
  disabled?: boolean;
  /** Force full picker (e.g. selecting workspace Account Manager). */
  forcePicker?: boolean;
};

/**
 * Assignee control that locks craft users to themselves and scopes leads
 * to the project roster when `accountId` / `projectId` is known.
 */
export function MarketingAssigneeField({
  accountId = null,
  projectId: projectIdProp = null,
  value,
  onValueChange,
  placeholder,
  className,
  allowUnassigned,
  disabled = false,
  forcePicker = false,
}: Props) {
  const { user, projectId: gatedProjectId, canAssignOthers } = useDigitalAssigneeGate(accountId);
  const projectId = projectIdProp ?? gatedProjectId;
  const showPicker = forcePicker || canAssignOthers;

  if (!showPicker) {
    return (
      <Input
        className={className ?? "h-8 w-full text-xs"}
        value={user?.name ?? "You"}
        disabled
        readOnly
      />
    );
  }

  return (
    <MarketingAssigneeSelect
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      className={className}
      allowUnassigned={allowUnassigned}
      disabled={disabled}
      projectId={projectId}
    />
  );
}
