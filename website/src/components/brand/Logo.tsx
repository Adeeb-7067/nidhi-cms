import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  priority?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
};

const sizes = {
  sm: { w: 36, h: 36 },
  md: { w: 48, h: 48 },
  lg: { w: 72, h: 72 },
  xl: { w: 120, h: 120 },
  hero: { w: 220, h: 220 },
};

export function Logo({ className, priority, size = "md" }: LogoProps) {
  const { w, h } = sizes[size];

  return (
    <Image
      src="/brand/sk-logo.png"
      alt="Satyakabir Technologies"
      width={w}
      height={h}
      priority={priority}
      className={cn(
        // Screen blend knocks out the black plate on dark UI; keep normal compositing in light mode.
        "select-none object-contain dark:[mix-blend-mode:screen]",
        className,
      )}
    />
  );
}
