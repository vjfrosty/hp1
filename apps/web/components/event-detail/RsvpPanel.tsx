"use client";

import { useState } from "react";
import { Car, Clock } from "lucide-react";
import { HUMOROUS_EXCUSES, type AttendeeDTO, type PublicEvent, type RsvpInput } from "@hp1/shared";

import { useToast } from "@/components/ui/toast";
import { useRsvp } from "@/hooks/api/events";

import { freeSeats, rsvpConfirmLabel } from "./helpers";

const LATE_MINUTES = 15;
const FALLBACK_EXCUSE = HUMOROUS_EXCUSES[4] ?? "Ще обясня на следващото заседание.";

/** "Ще дойда, ама..." — confirm / maybe / decline with excuse, late and non-alcoholic toggles. */
export function RsvpPanel({
  event,
  mine,
  inviteCode,
}: {
  event: PublicEvent;
  /** The viewer's attendee row; visible only once confirmed. */
  mine: AttendeeDTO | undefined;
  inviteCode?: string;
}) {
  const { showError } = useToast();
  const rsvp = useRsvp(event.id);
  const [showExcuses, setShowExcuses] = useState(false);
  const [customExcuse, setCustomExcuse] = useState("");

  const status = event.myStatus;
  const full = freeSeats(event.counts.confirmed, event.maxAttendees) === 0;
  const busy = rsvp.isPending;

  const send = (input: Omit<RsvpInput, "inviteCode">) =>
    rsvp.mutate({ ...input, ...(inviteCode ? { inviteCode } : {}) }, { onError: (err) => showError(err) });

  const decline = (excuse: string) => {
    send({ status: "declined", excuse: excuse.slice(0, 200) });
    setShowExcuses(false);
    setCustomExcuse("");
  };

  const chip = (active: boolean, activeClass: string) =>
    `inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-colors disabled:opacity-50 ${
      active ? activeClass : "border-line bg-canvas text-ink-muted hover:text-ink"
    }`;

  return (
    <div className="mt-5 space-y-3 border-t border-line/80 pt-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setShowExcuses(false);
            send({ status: "confirmed" });
          }}
          disabled={busy || status === "pending_approval" || (full && status !== "confirmed")}
          className={`min-h-[44px] whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            status === "pending_approval"
              ? "bg-brass text-surface"
              : "bg-tavern text-canvas hover:bg-tavern-hover disabled:opacity-40"
          }`}
        >
          {rsvpConfirmLabel(status, event.manualApproval)}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setShowExcuses(false);
            send({ status: "maybe" });
          }}
          className={`min-h-[44px] whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
            status === "maybe" ? "border-ink bg-surface-muted text-ink" : "border-line bg-canvas text-ink-muted hover:text-ink"
          }`}
        >
          Ще видим
        </button>

        <button
          type="button"
          disabled={busy}
          aria-expanded={showExcuses}
          onClick={() => setShowExcuses((s) => !s)}
          className={`min-h-[44px] whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
            status === "declined" ? "border-burgundy bg-burgundy/10 text-burgundy" : "border-line bg-canvas text-ink-muted hover:text-burgundy"
          }`}
        >
          Този път ме няма
        </button>
      </div>

      {status === "pending_approval" && (
        <p className="text-xs text-ink-muted">
          Заявката ти чака организатора ({event.organizer.nickname}). Адресът и чатът се отключват след одобрение.
        </p>
      )}
      {full && status !== "confirmed" && status !== "pending_approval" && (
        <p className="text-xs font-semibold text-burgundy">Масата е пълна (можеш да натиснеш „Ще видим“).</p>
      )}

      {status === "confirmed" && mine && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              send({ status: "confirmed", lateMinutes: mine.lateMinutes ? 0 : LATE_MINUTES, nonAlcoholic: mine.nonAlcoholic })
            }
            className={chip(Boolean(mine.lateMinutes), "border-brass bg-brass/15 text-[#7A5218]")}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>
              {mine.lateMinutes ? `Закъснявам с ${mine.lateMinutes} мин ✓` : `Закъснявам с ${LATE_MINUTES} мин`}
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              send({ status: "confirmed", lateMinutes: mine.lateMinutes ?? 0, nonAlcoholic: !mine.nonAlcoholic })
            }
            className={chip(mine.nonAlcoholic, "border-tavern bg-tavern/10 text-tavern")}
          >
            <Car className="h-3.5 w-3.5" />
            <span>{mine.nonAlcoholic ? "На безалкохолно / шофьор ✓" : "Избирам безалкохолно"}</span>
          </button>
        </div>
      )}

      {showExcuses && (
        <div className="space-y-3 rounded-xl border border-line bg-canvas p-4">
          <p className="text-xs font-semibold text-ink">Избери официално оправдание пред дружината:</p>
          <div className="flex flex-wrap gap-2">
            {HUMOROUS_EXCUSES.map((excuse) => (
              <button
                key={excuse}
                type="button"
                disabled={busy}
                onClick={() => decline(excuse)}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-left text-xs text-ink transition-colors hover:border-burgundy hover:text-burgundy"
              >
                {excuse}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              decline(customExcuse.trim() || FALLBACK_EXCUSE);
            }}
          >
            <input
              type="text"
              value={customExcuse}
              maxLength={200}
              onChange={(e) => setCustomExcuse(e.target.value)}
              placeholder="Или напиши своя причина..."
              aria-label="Своя причина"
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink"
            />
            <button type="submit" disabled={busy} className="rounded-lg bg-burgundy px-3.5 py-2 text-xs font-semibold text-canvas">
              Откажи
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
