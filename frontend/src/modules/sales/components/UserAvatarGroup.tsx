import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatarGroup({
  users,
  max = 4,
  size = "sm",
  className,
}: {
  users: { id: number; name: string; avatarUrl?: string }[];
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

export function ExecutiveAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-semibold">
          {name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs font-medium truncate">{name}</span>
    </div>
  );
}
