import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useListWarnings,
  useCreateWarning,
  useRevokeWarning,
} from "@/api/warnings";

interface WarnEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: { id: number; name: string } | null;
}

function todayValue(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function WarnEmployeeDialog({ open, onOpenChange, employee }: WarnEmployeeDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayValue());
  const [endDate, setEndDate] = useState(todayValue());

  const { data, isLoading } = useListWarnings(
    { targetUserId: employee?.id, status: "active" },
    open && !!employee,
  );
  // The query is already scoped to active warnings; the extra guard keeps the
  // UI correct even if a cached response contains other statuses.
  const activeWarnings = (data?.warnings ?? []).filter((w) => w.status === "active");

  const createWarning = useCreateWarning();
  const revokeWarning = useRevokeWarning();

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setStartDate(todayValue());
      setEndDate(todayValue());
    }
  }, [open, employee?.id]);

  const handleSubmit = () => {
    if (!employee) return;
    if (!title.trim()) {
      toast.error("Please enter a title.");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description.");
      return;
    }
    if (endDate < startDate) {
      toast.error("End date must be on or after the start date.");
      return;
    }
    createWarning.mutate(
      {
        targetUserId: employee.id,
        title: title.trim(),
        description: description.trim(),
        startDate,
        endDate,
      },
      {
        onSuccess: () => {
          toast.success("Warning issued.");
          setTitle("");
          setDescription("");
          setStartDate(todayValue());
          setEndDate(todayValue());
        },
        onError: (err: unknown) => {
          toast.error(err instanceof Error ? err.message : "Failed to issue warning.");
        },
      },
    );
  };

  const handleRevoke = (id: number) => {
    revokeWarning.mutate(id, {
      onSuccess: () => toast.success("Warning revoked."),
      onError: (err: unknown) =>
        toast.error(err instanceof Error ? err.message : "Failed to revoke warning."),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Warn {employee?.name ?? "employee"}
          </DialogTitle>
          <DialogDescription>
            This warning shows on the employee's dashboard during the selected date range.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="warning-title">Title</Label>
            <Input
              id="warning-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Repeated late log submissions"
              maxLength={140}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="warning-description">Description</Label>
            <Textarea
              id="warning-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the reason and expected corrective action…"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="warning-start">Start date</Label>
              <Input
                id="warning-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="warning-end">End date</Label>
              <Input
                id="warning-end"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {(isLoading || activeWarnings.length > 0) && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Active warnings</p>
              {isLoading ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : (
                activeWarnings.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-start justify-between gap-3 rounded-md bg-background px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{w.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(w.startDate), "d MMM yyyy")} –{" "}
                        {format(new Date(w.endDate), "d MMM yyyy")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleRevoke(w.id)}
                      disabled={revokeWarning.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSubmit} disabled={createWarning.isPending}>
            {createWarning.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Issue warning
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
