import { useEffect } from "react";
import { isElectron } from "@/lib/electron-bridge";
import { toast } from "sonner";

export function UpdateNotificationBanner() {
  useEffect(() => {
    if (!isElectron()) return;

    const unsubAvailable = window.electron!.onUpdateAvailable(({ version }) => {
      toast.info(`Update v${version} is downloading…`, { duration: 4000 });
    });

    const unsubDownloaded = window.electron!.onUpdateDownloaded(({ version }) => {
      toast.message(`v${version} ready to install`, {
        description: "Restart the app to apply the update.",
        duration: Infinity,
        action: {
          label: "Restart now",
          onClick: () => window.electron!.quitAndInstall(),
        },
      });
    });

    return () => {
      unsubAvailable();
      unsubDownloaded();
    };
  }, []);

  // The toast handles all UI; this component only wires up the listeners.
  return null;
}
