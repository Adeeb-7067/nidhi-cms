import { cn } from "@/lib/utils";

export function CounselAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
        {initials}
      </span>
      <span className="text-xs truncate max-w-[120px]">{name}</span>
    </div>
  );
}
