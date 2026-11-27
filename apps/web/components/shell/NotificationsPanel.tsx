"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, ShieldAlert, X } from "lucide-react";
import type { NotificationsResponse } from "@hp1/shared";

import { useMarkNotificationsRead } from "@/hooks/api/community";
import { useToast } from "@/components/ui/toast";

const stamp = new Intl.DateTimeFormat("bg-BG", {
  timeZone: "Europe/Sofia",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Right-hand drawer with the viewer's notifications (ported from legacy AppShell). */
export function NotificationsPanel({
  data,
  isLoading,
  onClose,
}: {
  data: NotificationsResponse | undefined;
  isLoading: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const markRead = useMarkNotificationsRead();
  const { showError } = useToast();
  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-xs" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="notif-title" className="font-display text-lg font-bold text-ink">
            Известия на дружината
          </h2>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markRead.mutate(undefined, { onError: showError })}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-tavern hover:bg-surface-muted"
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                <span>Всички прочетени</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted"
              aria-label="Затвори"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 divide-y divide-line/70 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 p-5" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-muted" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-muted">
              Няма нови известия. Всичко е спокойно около масата.
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.read) markRead.mutate([n.id]);
                  onClose();
                  if (n.eventId) router.push(`/events/${n.eventId}`);
                }}
                className={`w-full px-5 py-4 text-left transition-colors hover:bg-surface-muted/60 ${n.read ? "" : "bg-tavern/5"}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-burgundy" aria-label="Непрочетено" />}
                    {n.title}
                  </span>
                  <time dateTime={n.createdAt} className="shrink-0 font-mono text-xs text-ink-muted tabular-nums">
                    {stamp.format(new Date(n.createdAt))}
                  </time>
                </div>
                <p className="mt-1 text-sm leading-snug text-ink-muted">{n.body}</p>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-line px-5 py-3 text-xs text-ink-muted">
          <ShieldAlert className="h-4 w-4 shrink-0 text-burgundy" aria-hidden="true" />
          <span>Ако шофираш, избери безалкохолно.</span>
        </div>
      </div>
    </div>
  );
}
