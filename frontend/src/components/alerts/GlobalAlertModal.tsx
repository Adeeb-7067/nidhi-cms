import { useEffect, useState } from "react";
import { Megaphone, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRealtime } from "@/contexts/RealtimeContext";
import { resolveFileUrl } from "@/lib/resolve-file-url";
import { useDismissAlert, useGetPendingAlerts, type PendingAlert } from "@/api/alerts";

export function GlobalAlertModal() {
  const { socket } = useRealtime();
  const [queue, setQueue] = useState<PendingAlert[]>([]);
  const { data: pendingData } = useGetPendingAlerts();
  const dismissAlert = useDismissAlert();

  // Catch-up: merge alerts fired while this client was offline/closed.
  useEffect(() => {
    if (!pendingData?.alerts?.length) return;
    setQueue((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const toAdd = pendingData.alerts.filter((a) => !existingIds.has(a.id));
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
    });
  }, [pendingData]);

  // Live delivery for connected clients.
  useEffect(() => {
    if (!socket) return;
    const onAlert = (data: PendingAlert) => {
      setQueue((prev) => (prev.some((a) => a.id === data.id) ? prev : [...prev, data]));
    };
    socket.on("alert:new", onAlert);
    return () => {
      socket.off("alert:new", onAlert);
    };
  }, [socket]);

  const current = queue[0] ?? null;

  const dismissCurrent = () => {
    if (!current) return;
    dismissAlert.mutate(current.id);
    setQueue((prev) => prev.slice(1));
  };

  const remaining = queue.length - 1;

  return (
    <Dialog open={current != null} onOpenChange={(open) => { if (!open) dismissCurrent(); }}>
      <DialogContent className="overflow-hidden border-border bg-card p-0 gap-0 shadow-2xl shadow-black/20 sm:max-w-xl">
        {current && (
          <>
            {current.photoUrl ? (
              <div className="relative w-full shrink-0 overflow-hidden bg-muted/40">
                <img
                  src={resolveFileUrl(current.photoUrl)}
                  alt=""
                  className="mx-auto block h-auto w-full max-h-[min(60vh,520px)] object-contain object-center"
                />
              </div>
            ) : (
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            )}

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
              <DialogHeader className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                    <Megaphone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 space-y-0.5 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Announcement
                    </p>
                    <DialogTitle className="text-lg leading-snug">{current.title}</DialogTitle>
                  </div>
                </div>
              </DialogHeader>

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {current.description}
              </p>

              <DialogFooter className="items-center gap-3 pt-1 sm:justify-between">
                {remaining > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {remaining} more alert{remaining > 1 ? "s" : ""} waiting
                  </p>
                ) : (
                  <span />
                )}
                <Button onClick={dismissCurrent} className="w-full gap-1.5 sm:w-auto">
                  <CheckCircle2 className="h-4 w-4" />
                  Got it
                </Button>
              </DialogFooter>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
