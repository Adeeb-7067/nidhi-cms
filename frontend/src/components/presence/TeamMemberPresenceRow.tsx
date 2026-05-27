import { AvatarWithPresence } from "./AvatarWithPresence";
import { PresenceBadge } from "./PresenceBadge";
import {
  formatLastLogin,
  formatLastSeen,
  mergeUserPresence,
  parsePresenceStatus,
  type PresenceStatus,
} from "@/lib/presence";
import { usePresence } from "@/contexts/PresenceContext";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

export type TeamMemberPresenceSource = {
  userId: number;
  name: string;
  avatarUrl?: string | null;
  designation?: string | null;
  subType?: string | null;
  lastLoginAt?: string | null;
  lastSeenAt?: string | null;
  presenceStatus?: PresenceStatus | string | null;
  isActiveNow?: boolean;
};

type TeamMemberPresenceRowProps = {
  member: TeamMemberPresenceSource;
  className?: string;
  compact?: boolean;
};

export function TeamMemberPresenceRow({
  member,
  className,
  compact = false,
}: TeamMemberPresenceRowProps) {
  const { getPresence } = usePresence();
  const merged = mergeUserPresence(
    {
      id: member.userId,
      lastLoginAt: member.lastLoginAt,
      lastSeenAt: member.lastSeenAt,
      presenceStatus: member.presenceStatus,
      isActiveNow: member.isActiveNow,
    },
    getPresence(member.userId),
  );
  const status = parsePresenceStatus(merged.presenceStatus);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border/60 bg-muted/15 p-3",
        className,
      )}
    >
      <AvatarWithPresence
        name={member.name}
        avatarUrl={member.avatarUrl}
        presenceStatus={status}
        avatarClassName={compact ? "h-9 w-9" : "h-10 w-10"}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
          <PresenceBadge status={status} />
        </div>
        {(member.designation || member.subType) && (
          <p className="text-[10px] text-muted-foreground truncate">
            {[member.designation, member.subType].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">
          {formatLastSeen(merged.lastSeenAt, status)}
        </p>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0 opacity-70" />
          <span>Last login: {formatLastLogin(merged.lastLoginAt)}</span>
        </p>
      </div>
    </div>
  );
}
