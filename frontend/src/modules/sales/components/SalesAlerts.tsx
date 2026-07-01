import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGetDueReminders, useListFollowUps } from "@/api/sales";

type AlertItem =
  | { kind: "reminder"; leadId: number; leadName: string; date: string; note: string }
  | { kind: "followup"; followUpId: number; leadId: number; type: string };

function sessionKey(item: AlertItem) {
  if (item.kind === "reminder") return `sales-alert-reminder-${item.leadId}-${item.date}`;
  return `sales-alert-followup-${item.followUpId}`;
}

function isDismissed(item: AlertItem) {
  try {
    return sessionStorage.getItem(sessionKey(item)) === "1";
  } catch {
    return false;
  }
}

function dismiss(item: AlertItem) {
  try {
    sessionStorage.setItem(sessionKey(item), "1");
  } catch {
    // ignore
  }
}

function alertTitle(item: AlertItem) {
  if (item.kind === "reminder") {
    return `Reminder: ${item.leadName}`;
  }
  return `Follow-up today — Lead #${item.leadId}`;
}

function alertBody(item: AlertItem) {
  if (item.kind === "reminder") {
    const when = format(new Date(item.date), "MMM d, h:mm a");
    return item.note ? `${when} · ${item.note}` : when;
  }
  return `${item.type} follow-up scheduled for today`;
}

function useSalesAlerts() {
  const [queue, setQueue] = useState<AlertItem[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const { data: remindersData } = useGetDueReminders();
  const { data: followUpsData } = useListFollowUps({ status: "scheduled", limit: 200 });

  useEffect(() => {
    const pending: AlertItem[] = [];
    const todayStr = format(new Date(), "yyyy-MM-dd");

    for (const lead of remindersData?.leads ?? []) {
      const item: AlertItem = {
        kind: "reminder",
        leadId: lead.id,
        leadName: lead.name,
        date: lead.reminder.date,
        note: lead.reminder.note,
      };
      if (!isDismissed(item)) pending.push(item);
    }

    for (const fu of followUpsData?.followUps ?? []) {
      const fuDate = format(new Date(fu.scheduledAt), "yyyy-MM-dd");
      if (fuDate !== todayStr) continue;
      const item: AlertItem = {
        kind: "followup",
        followUpId: fu.id,
        leadId: fu.leadId,
        type: fu.type,
      };
      if (!isDismissed(item)) pending.push(item);
    }

    if (pending.length > 0) {
      setQueue((prev) => {
        const existingKeys = new Set(prev.map(sessionKey));
        const newItems = pending.filter((i) => !existingKeys.has(sessionKey(i)));
        return newItems.length > 0 ? [...prev, ...newItems] : prev;
      });
    }
  }, [remindersData, followUpsData]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    for (const lead of remindersData?.leads ?? []) {
      const reminderTime = new Date(lead.reminder.date).getTime();
      const delay = reminderTime - Date.now();
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        const item: AlertItem = {
          kind: "reminder",
          leadId: lead.id,
          leadName: lead.name,
          date: lead.reminder.date,
          note: lead.reminder.note,
        };
        const t = setTimeout(() => {
          if (!isDismissed(item)) {
            setQueue((prev) => [...prev, item]);
          }
        }, delay);
        timersRef.current.push(t);
      }
    }

    return () => timersRef.current.forEach(clearTimeout);
  }, [remindersData]);

  const current = queue[0] ?? null;

  const dismissCurrent = () => {
    if (current) {
      dismiss(current);
      setQueue((prev) => prev.slice(1));
    }
  };

  return { current, dismissCurrent };
}

export function SalesAlerts() {
  const { current, dismissCurrent } = useSalesAlerts();

  return (
    <Dialog open={current != null} onOpenChange={(open) => { if (!open) dismissCurrent(); }}>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        {current && (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">{alertTitle(current)}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{alertBody(current)}</p>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button variant="outline" size="sm" onClick={dismissCurrent}>
                Dismiss
              </Button>
              <Link href={`/sales/leads/${current.leadId}`}>
                <Button size="sm" onClick={dismissCurrent}>
                  Open lead
                </Button>
              </Link>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
