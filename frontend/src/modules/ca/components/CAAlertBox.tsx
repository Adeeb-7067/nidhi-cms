import { useState } from "react";
import { Link } from "wouter";
import { X, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaAlert } from "../types";

const severityStyles = {
  critical: "border-red-500/30 bg-red-500/5 text-red-900 dark:text-red-100",
  warning: "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-100",
  info: "border-blue-500/30 bg-blue-500/5 text-blue-900 dark:text-blue-100",
};

const severityIcons = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function CAAlertBox({ alerts }: { alerts: CaAlert[] }) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((alert) => {
        const Icon = severityIcons[alert.severity];
        const content = (
          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border px-4 py-3",
              severityStyles[alert.severity],
            )}
          >
            <Icon className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{alert.title}</p>
              <p className="text-xs opacity-90 mt-0.5">{alert.body}</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDismissed((prev) => new Set(prev).add(alert.id));
              }}
              aria-label="Dismiss alert"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
        return alert.href ? (
          <Link key={alert.id} href={alert.href} className="block hover:opacity-95 transition-opacity">
            {content}
          </Link>
        ) : (
          <div key={alert.id}>{content}</div>
        );
      })}
    </div>
  );
}
