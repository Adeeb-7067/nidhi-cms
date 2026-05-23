import { cn } from "@/lib/utils";

const sizeClass = {
  sm: "h-6 w-6 border-2",
  md: "h-10 w-10 border-[3px]",
  lg: "h-14 w-14 border-4",
  xl: "h-16 w-16 border-4",
} as const;

type SpinLoaderProps = {
  size?: keyof typeof sizeClass;
  className?: string;
};

/** Circular border spin indicator (theme primary). */
export function SpinLoader({ size = "lg", className }: SpinLoaderProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-spin rounded-full border-muted-foreground/20 border-t-primary",
        sizeClass[size],
        className,
      )}
    />
  );
}
