"use client";

import { Lock, UserX } from "lucide-react";
import type { PublicEvent } from "@hp1/shared";

import { useToast } from "@/components/ui/toast";

import { Avatar } from "./Avatar";
import { type GroupedAttendees, roleTitle } from "./helpers";

/** "Кой е на масата". The full list arrives only for the organiser and confirmed attendees. */
export function Attendees({ event, groups, meId }: { event: PublicEvent; groups: GroupedAttendees; meId: string | undefined }) {
  const { show } = useToast();

  return (
    <div className="space-y-5 rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold text-ink">Кой е на масата</h2>
        <span className="font-mono text-xs tabular-nums text-ink-muted">{event.counts.confirmed} потвърдени</span>
      </div>

      {!event.attendees ? (
        <div className="flex items-start gap-3 rounded-xl bg-surface-muted p-3.5 text-xs text-ink">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-burgundy" />
          <p>
            Имената се виждат след потвърждение.{" "}
            <span className="font-mono tabular-nums">
              {event.counts.confirmed} идват · {event.counts.maybe} „ще видим“
              {event.counts.pending > 0 ? ` · ${event.counts.pending} чакат одобрение` : ""}
            </span>
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line/70">
            {groups.confirmed.map((att) => {
              const role = roleTitle(att.roleId);
              const details = [role, att.nonAlcoholic ? "Безалкохолно" : null, att.lateMinutes ? `Закъснява ${att.lateMinutes} мин` : null]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={att.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar user={att} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {att.nickname} {att.isOrganizer ? "(Организатор)" : ""}
                        {att.id === meId ? " (ти)" : ""}
                      </p>
                      {details && <p className="truncate text-xs text-ink-muted">{details}</p>}
                    </div>
                  </div>
                  {att.id !== meId && (
                    <button
                      type="button"
                      onClick={() => show("Скоро: блокирането идва в следващата версия.")}
                      className="shrink-0 text-xs text-ink-muted hover:text-burgundy"
                      title="Блокирай потребител"
                      aria-label={`Блокирай ${att.nickname}`}
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {groups.maybe.length > 0 && (
            <div className="border-t border-line pt-3">
              <p className="text-xs font-semibold text-ink-muted">Ще видим ({groups.maybe.length})</p>
              <p className="mt-1 text-sm text-ink">{groups.maybe.map((a) => a.nickname).join(", ")}</p>
            </div>
          )}

          {groups.declined.length > 0 && (
            <div className="space-y-2 border-t border-line pt-3">
              <p className="text-xs font-semibold text-burgundy">Оправдани отсъствия ({groups.declined.length})</p>
              {groups.declined.map((a) => (
                <p key={a.id} className="text-xs text-ink-muted">
                  <strong className="text-ink">{a.nickname}:</strong> „{a.excuse || "Ще обясня на следващото заседание."}“
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
