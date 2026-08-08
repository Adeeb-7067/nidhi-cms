"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

/**
 * Global error boundary. Catches runtime errors in any route segment and
 * presents a branded recovery screen rather than React's default crash UI.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to your error tracking service here (e.g., Sentry)
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md text-center">
        <Logo size="lg" className="mx-auto mb-6 opacity-90" />
        <p className="mb-3 font-deco text-[14px] tracking-[0.2em] text-muted-foreground">
          Something went wrong
        </p>
        <h1 className="mb-3 font-display text-4xl text-foreground md:text-5xl">
          Unexpected error
        </h1>
        <p className="mb-8 text-small text-muted-foreground">
          We hit an issue loading this page. Try again or return to the homepage.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex rounded-full border border-border px-7 py-3 text-label text-foreground transition-colors hover:bg-surface"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex rounded-full bg-[linear-gradient(115deg,#2B6BFF,#00D9FF)] px-7 py-3 text-label text-white"
          >
            Return home
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 font-mono text-[11px] text-muted-foreground/60">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
