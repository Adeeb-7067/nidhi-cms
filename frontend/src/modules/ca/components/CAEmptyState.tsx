import type { LucideIcon } from "lucide-react";
import { CmsEmptyState } from "@/components/cms";

/** CA empty state — icon required for parity with existing call sites. */
export function CAEmptyState({
  icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <CmsEmptyState
      icon={icon}
      title={title}
      description={description}
      className={className}
    />
  );
}
