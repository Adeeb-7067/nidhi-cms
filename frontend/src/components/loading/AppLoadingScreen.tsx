import { motion } from "framer-motion";
import { AppLogo } from "@/components/brand/AppLogo";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { LoadingBackground } from "./LoadingBackground";
import { SpinLoader } from "./SpinLoader";

const spring = { type: "spring", stiffness: 280, damping: 26 } as const;

export type AppLoadingScreenProps = {
  /** Primary status line */
  message?: string;
  /** Secondary line under the spinner */
  submessage?: string;
  /** Full viewport overlay vs in-layout (e.g. route chunk load inside shell) */
  variant?: "fullscreen" | "embedded";
  className?: string;
};

export function AppLoadingScreen({
  message = "Loading",
  submessage,
  variant = "fullscreen",
  className,
}: AppLoadingScreenProps) {
  const isFullscreen = variant === "fullscreen";
  const secondary =
    submessage ?? (isFullscreen ? `Welcome to ${BRAND.shortName}` : undefined);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden bg-background",
        isFullscreen && "fixed inset-0 z-[100] h-dvh w-full",
        !isFullscreen && "min-h-[50vh] w-full py-16",
        className,
      )}
    >
      <LoadingBackground />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="relative z-10 flex flex-col items-center gap-6 px-6"
      >
        <div className="relative flex h-28 w-28 items-center justify-center">
          <SpinLoader size="xl" className="absolute inset-0 h-full w-full border-[3px]" />
          <div className="relative rounded-xl bg-card/90 p-3 shadow-md ring-1 ring-border/50 backdrop-blur-sm">
            <AppLogo size="md" />
          </div>
        </div>

        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold tracking-tight text-foreground">{message}</p>
          {secondary ? (
            <p className="max-w-xs text-xs text-muted-foreground">{secondary}</p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
