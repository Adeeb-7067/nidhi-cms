import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/lib/presence";
import { PresenceIndicator } from "./PresenceIndicator";

type AvatarWithPresenceProps = {
  name: string;
  avatarUrl?: string | null;
  presenceStatus?: PresenceStatus;
  className?: string;
  avatarClassName?: string;
  showPresence?: boolean;
};

export function AvatarWithPresence({
  name,
  avatarUrl,
  presenceStatus = "offline",
  className,
  avatarClassName,
  showPresence = true,
}: AvatarWithPresenceProps) {
  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <Avatar className={cn("h-9 w-9", avatarClassName)}>
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} className="object-cover" /> : null}
        <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
          {name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      {showPresence && (
        <PresenceIndicator
          status={presenceStatus}
          size="sm"
          className="absolute -bottom-0.5 -right-0.5"
          title={presenceStatus}
        />
      )}
    </div>
  );
}
