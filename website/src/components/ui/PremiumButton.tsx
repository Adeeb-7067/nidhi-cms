"use client";

import { cn } from "@/lib/utils";
import { Magnetic } from "./Magnetic";

type PremiumButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline";
  magnetic?: boolean;
};

export function PremiumButton({
  className,
  variant = "primary",
  magnetic = true,
  children,
  ...props
}: PremiumButtonProps) {
  const base =
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3 text-[13px] font-medium tracking-[0.03em] transition-[transform,box-shadow,border-color,background-color,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 active:scale-[0.97] disabled:opacity-50";

  const variants = {
    primary:
      "text-white shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_18px_50px_-18px_rgba(43,107,255,0.65)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_26px_70px_-16px_rgba(0,217,255,0.45)]",
    ghost:
      "text-secondary-foreground hover:text-foreground bg-muted hover:bg-muted/80",
    outline:
      "text-foreground border border-border bg-transparent hover:border-brand-cyan/50 hover:bg-muted",
  };

  const inner = (
    <button className={cn(base, variants[variant], className)} {...props}>
      {variant === "primary" && (
        <>
          <span
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#2B6BFF_0%,#4B8AFF_42%,#00D9FF_100%)] bg-[length:220%_220%] bg-[position:0%_50%] transition-[background-position] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-[position:100%_50%]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-[5] translate-x-[-120%] bg-[linear-gradient(105deg,transparent_30%,rgba(255,255,255,0.35)_50%,transparent_70%)] opacity-0 transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-[120%] group-hover:opacity-100"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-[4] opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(140px_70px_at_50%_0%,rgba(255,255,255,0.3),transparent_70%)]"
          />
        </>
      )}
      <span className="relative z-10 flex items-center gap-2 font-sans">{children}</span>
    </button>
  );

  if (!magnetic) return inner;
  return <Magnetic className="inline-flex">{inner}</Magnetic>;
}
