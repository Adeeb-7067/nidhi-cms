import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isElectron } from "@/lib/electron-bridge";
import { useMonitoringStatus, useConsentStatus, useRecordConsent } from "@/api/monitoring";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Shield, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Bottom-right consent banner — appears when employee hasn't yet acknowledged the
 *  monitoring policy. Non-blocking: they can still use the app, but screenshots
 *  won't run until they accept. Scheduler start/stop is owned by WorkSessionContext. */
export function ConsentDialog() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  // Persist decline in sessionStorage so a page refresh within the same session
  // doesn't re-show the banner. Cleared automatically when the tab/window closes.
  const [declined, setDeclined] = useState(() =>
    sessionStorage.getItem("cms:consent-declined") === "1"
  );

  const { data: status, isLoading: loadingStatus } = useMonitoringStatus(
    isElectron() && !!user,
  );
  const { data: consent, isLoading: loadingConsent } = useConsentStatus(
    isElectron() && !!user && !!status?.screenshotEnabled,
  );
  const { mutateAsync: recordConsent, isPending: recording } = useRecordConsent();

  // Only developer / tester / qa can be monitored — admins never need to consent.
  const isMonitorableRole = ["developer", "tester", "qa"].includes(user?.role ?? "");

  if (
    !isElectron() ||
    !user ||
    !isMonitorableRole ||
    loadingStatus ||
    loadingConsent ||
    !status?.screenshotEnabled ||
    declined
  ) {
    return null;
  }

  const needsBanner = !consent?.hasConsented || consent?.needsRenewal;
  if (!needsBanner) return null;

  const handleAccept = async () => {
    try {
      await recordConsent();
      toast.success("Monitoring consent recorded. Screenshots will start when you clock in.");
    } catch {
      toast.error("Could not record consent. Please try again.");
    }
  };

  const handleDecline = () => {
    sessionStorage.setItem("cms:consent-declined", "1");
    setDeclined(true);
    toast("Monitoring declined for this session.", {
      description: "Screenshots will not be captured until you consent.",
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)]">
      <div className={cn(
        "rounded-xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden",
        "ring-1 ring-primary/20 transition-all duration-200",
      )}>
        {/* Header row — always visible */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Monitor className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">Screen Monitoring Notice</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
              Every <strong className="text-foreground">{status.screenshotIntervalMinutes} min</strong> while clocked in
              {consent?.needsRenewal && (
                <Badge variant="destructive" className="ml-2 text-[9px] px-1 py-0 h-4">Policy updated</Badge>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title={expanded ? "Show less" : "Show details"}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleDecline}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Decline for this session"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Expandable detail section */}
        {expanded && (
          <div className="border-t border-border/50 px-4 py-3 space-y-2.5 bg-muted/20">
            <ul className="space-y-1.5">
              {[
                "Captures only occur during active clock-in sessions",
                "Idle time (5+ min) is automatically skipped",
                `Stored for ${status.screenshotRetentionDays} days then deleted`,
                "Accessible to your organization admins only",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3 mt-0.5 shrink-0 text-primary/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-muted-foreground/60">
              Policy version: {status.screenshotConsentVersion}
            </p>
          </div>
        )}

        {/* Action row */}
        <div className="flex gap-2 px-4 py-3 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            className="flex-1 h-8 text-xs"
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={recording}
            className="flex-1 h-8 text-xs"
          >
            {recording ? "Saving…" : "Allow monitoring"}
          </Button>
        </div>
      </div>
    </div>
  );
}
