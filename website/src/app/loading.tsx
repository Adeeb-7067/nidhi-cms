import { Logo } from "@/components/brand/Logo";

/**
 * Root loading skeleton. Shown during Next.js route transitions for any page
 * that doesn't define its own `loading.tsx`. Matches the page-offset pattern so
 * the navbar doesn't shift during the transition.
 */
export default function RootLoading() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background text-foreground">
      <Logo size="lg" className="mb-8 animate-pulse opacity-60" />

      {/* Skeleton hero region */}
      <div className="mx-auto w-full max-w-[var(--grid-max)] page-pad">
        {/* Eyebrow */}
        <div className="mx-auto mb-4 h-3 w-28 animate-pulse rounded-full bg-muted" />
        {/* Title */}
        <div className="mx-auto mb-3 h-10 w-[70%] max-w-lg animate-pulse rounded-xl bg-muted" />
        {/* Subtitle */}
        <div className="mx-auto mb-8 h-5 w-[50%] max-w-sm animate-pulse rounded-lg bg-muted" />

        {/* Skeleton content blocks */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl bg-muted"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
