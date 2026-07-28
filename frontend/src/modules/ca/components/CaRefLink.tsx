import { Link } from "wouter";
import { cn } from "@/lib/utils";

/** Clickable table reference — CMS pattern used in Finance vendors/payments. */
export function CaRefLink({
  href,
  children,
  className,
  mono,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "font-medium text-primary hover:underline underline-offset-2",
        mono && "font-mono",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}
