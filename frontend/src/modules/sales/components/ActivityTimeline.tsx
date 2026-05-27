import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  UserPlus,
  FileText,
  CreditCard,
  Phone,
  MessageSquare,
  Circle,
  Layers,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SalesActivity } from "../types";

const iconMap = {
  lead: UserPlus,
  proposal: FileText,
  payment: CreditCard,
  follow_up: Phone,
  note: MessageSquare,
  installment: Layers,
  receipt: FileCheck,
};

const colorMap = {
  lead: "bg-blue-500/15 text-blue-600 ring-blue-500/25",
  proposal: "bg-violet-500/15 text-violet-600 ring-violet-500/25",
  payment: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/25",
  follow_up: "bg-amber-500/15 text-amber-600 ring-amber-500/25",
  note: "bg-slate-500/15 text-slate-600 ring-slate-500/25",
  installment: "bg-cyan-500/15 text-cyan-600 ring-cyan-500/25",
  receipt: "bg-indigo-500/15 text-indigo-600 ring-indigo-500/25",
};

export function ActivityTimeline({
  activities,
  limit,
  className,
}: {
  activities: SalesActivity[];
  limit?: number;
  className?: string;
}) {
  const items = limit ? activities.slice(0, limit) : activities;

  return (
    <motion.div className={cn("space-y-0", className)}>
      {items.map((activity, i) => {
        const Icon = iconMap[activity.type] ?? Circle;
        return (
          <div key={activity.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < items.length - 1 && (
              <span className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
            )}
            <motion.div
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1",
                colorMap[activity.type],
              )}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <Icon className="h-3.5 w-3.5" />
            </motion.div>
            <motion.div
              className="min-w-0 flex-1 pt-0.5"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <p className="text-sm font-medium leading-tight">{activity.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {activity.description}
              </p>
              <p className="text-[10px] text-muted-foreground/80 mt-1">
                {activity.actor} ·{" "}
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </p>
            </motion.div>
          </div>
        );
      })}
    </motion.div>
  );
}
