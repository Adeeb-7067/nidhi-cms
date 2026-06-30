import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function UserAvatarGroup({
  users,
  max = 4,
  size = "sm",
  className,
}: {
  users: { id: number; name: string; avatarUrl?: string | null }[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const visible = users.slice(0, max);
  const extra = users.length - max;
  const sizeClass = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visible.map((u) => (
        <Avatar key={u.id} className={cn(sizeClass, "ring-2 ring-background")}>
          {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name} />}
          <AvatarFallback className="bg-primary/15 text-primary font-semibold">
            {u.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-2 ring-background",
            sizeClass,
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

export function ExecutiveAvatar({ name, avatarUrl, className }: { name: string; avatarUrl?: string | null; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <Avatar className="h-7 w-7 shrink-0">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-semibold">
          {name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs font-medium truncate">{name}</span>
    </div>
  );
}

type SlotUser = { id: number; name: string; avatarUrl?: string | null };

function SlotAvatar({ user, label }: { user: SlotUser; label: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Avatar className="h-6 w-6 ring-2 ring-background cursor-default shrink-0">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
            <AvatarFallback className="text-[9px] font-semibold bg-primary/15 text-primary">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs font-medium">{user.name}</p>
          <p className="text-[10px] text-primary-foreground/70">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function LeadTeamAvatars({
  assigned,
  creator,
  className,
}: {
  assigned: SlotUser | null;
  creator: SlotUser | null;
  className?: string;
}) {
  if (!assigned && !creator) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const sameUser = assigned && creator && assigned.id === creator.id;

  return (
    <div className={cn("flex -space-x-1.5", className)}>
      {assigned && (
        <SlotAvatar
          user={assigned}
          label={sameUser ? "Assigned · Created by" : "Assigned to"}
        />
      )}
      {creator && !sameUser && (
        <SlotAvatar user={creator} label="Created by" />
      )}
    </div>
  );
}
