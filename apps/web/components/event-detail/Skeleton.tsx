/** Placeholder while the event loads (also used by the route's loading.tsx). */
export function EventDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Зареждане на сбирката">
      <div className="h-11 w-48 animate-pulse rounded-xl bg-surface-muted" />
      <div className="grid overflow-hidden rounded-2xl border border-line bg-surface lg:grid-cols-12">
        <div className="min-h-[210px] animate-pulse bg-surface-muted lg:col-span-5" />
        <div className="space-y-3 p-5 sm:p-7 lg:col-span-7">
          <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-surface-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-surface-muted" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-surface-muted" />
          <div className="flex gap-2 pt-4">
            <div className="h-11 w-28 animate-pulse rounded-xl bg-surface-muted" />
            <div className="h-11 w-28 animate-pulse rounded-xl bg-surface-muted" />
          </div>
        </div>
      </div>
      <div className="h-12 animate-pulse rounded-xl bg-surface-muted" />
      <span className="sr-only">Масата се подрежда…</span>
    </div>
  );
}
