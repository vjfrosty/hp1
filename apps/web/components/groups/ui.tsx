"use client";

import type { UserSummary } from "@hp1/shared";

/** Small building blocks shared by the groups, chronicle and profile screens. */

export const inputClass =
  "w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-tavern/40";
export const labelClass = "block text-xs font-semibold text-ink-muted";
export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-tavern px-4 py-2.5 text-sm font-semibold text-canvas hover:bg-tavern-hover disabled:opacity-60 min-h-[44px]";
export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm font-semibold text-ink-muted hover:text-ink disabled:opacity-60 min-h-[44px]";
export const cardClass = "rounded-2xl border border-line bg-surface";

export function Avatar({ user, size = "sm" }: { user: Pick<UserSummary, "nickname" | "avatarInitials" | "avatarColor">; size?: "sm" | "lg" }) {
  const dims = size === "lg" ? "h-16 w-16 rounded-2xl text-2xl" : "h-8 w-8 rounded-full text-xs";
  return (
    <span
      title={user.nickname}
      className={`inline-flex shrink-0 items-center justify-center font-display font-bold text-canvas ${dims}`}
      style={{ backgroundColor: user.avatarColor }}
    >
      {user.avatarInitials}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-2xl bg-surface-muted ${className}`} />;
}

export function SkeletonList({ count = 3, className = "h-40" }: { count?: number; className?: string }) {
  return (
    <div className="space-y-4" role="status" aria-label="Зареждане">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      {children ? <div className="mt-1 text-sm text-ink-muted">{children}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-burgundy/40 bg-burgundy/5 p-5 text-sm text-burgundy">
      <p className="font-semibold">{error instanceof Error ? error.message : "Нещо се обърка. Опитайте отново."}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-2 font-semibold underline">
          Опитай пак
        </button>
      ) : null}
    </div>
  );
}

export function CitySelect({
  id,
  value,
  onChange,
  cities,
  allLabel,
}: {
  id?: string;
  value: string;
  onChange: (city: string) => void;
  cities: readonly { name: string }[];
  /** When set, adds an empty "all cities" option with this label. */
  allLabel?: string;
}) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      {allLabel !== undefined ? <option value="">{allLabel}</option> : null}
      {cities.map((c) => (
        <option key={c.name} value={c.name}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
