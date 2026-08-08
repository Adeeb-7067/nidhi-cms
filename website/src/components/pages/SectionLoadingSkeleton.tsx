/**
 * Shared loading skeleton for section hub and leaf pages.
 * Mirrors the ExperiencePage layout: breadcrumbs → hero → content blocks.
 */
export function SectionLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground page-offset">
      <div className="mx-auto w-full max-w-[var(--grid-max)] page-pad py-8">
        {/* Breadcrumb skeleton */}
        <div className="mb-10 flex items-center gap-2">
          <div className="h-3 w-12 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-2 text-muted-foreground">/</div>
          <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-2 text-muted-foreground">/</div>
          <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
        </div>

        {/* Hero skeleton */}
        <div className="mb-16 max-w-3xl">
          {/* Eyebrow */}
          <div className="mb-4 h-3 w-24 animate-pulse rounded-full bg-muted" />
          {/* Title */}
          <div className="mb-4 h-12 w-[80%] animate-pulse rounded-xl bg-muted" />
          {/* Summary */}
          <div className="mb-2 h-5 w-full animate-pulse rounded-lg bg-muted" />
          <div className="mb-8 h-5 w-[65%] animate-pulse rounded-lg bg-muted" />
          {/* CTA */}
          <div className="h-12 w-44 animate-pulse rounded-full bg-muted" />
        </div>

        {/* Metrics strip skeleton */}
        <div className="mb-16 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 rounded-2xl border border-divider p-6 animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="h-8 w-16 rounded-lg bg-muted" />
              <div className="h-3 w-20 rounded-full bg-muted" />
            </div>
          ))}
        </div>

        {/* Content cards skeleton */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl bg-muted"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
