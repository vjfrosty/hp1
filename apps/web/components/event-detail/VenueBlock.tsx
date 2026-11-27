import { Lock, MapPin } from "lucide-react";
import type { PublicEvent } from "@hp1/shared";

/**
 * Venue and address. The exact address comes only from `event.exactAddress`,
 * which the server sends to the organiser and confirmed attendees (rule 3).
 */
export function VenueBlock({ event, children }: { event: PublicEvent; children?: React.ReactNode }) {
  const pending = event.myStatus === "pending_approval";
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-display text-lg font-bold text-ink">Място и точен адрес</h2>

      <p className="mt-2 text-sm font-semibold text-ink">
        {event.venueName} — {event.city}, кв. {event.neighborhood}
      </p>

      {event.exactAddress !== undefined ? (
        <p className="mt-1.5 inline-flex items-start gap-1.5 text-sm text-ink-muted">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-tavern" />
          <span>{event.exactAddress || "Детайлите са в чата."}</span>
        </p>
      ) : (
        <div className="mt-3 flex items-start gap-3 rounded-xl bg-surface-muted p-3.5 text-xs text-ink">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-burgundy" />
          <p>
            <strong>Частен адрес:</strong> точният адрес се показва след потвърждение
            {event.manualApproval ? " и одобрение от организатора" : ""}. На картата е само кварталът.
            {pending && <span className="mt-1 block text-ink-muted">Заявката ти чака {event.organizer.nickname}.</span>}
          </p>
        </div>
      )}

      {children}

      <div className="mt-4 border-t border-line/70 pt-3">
        <p className="text-xs font-semibold text-ink-muted">Планирана храна и мезе</p>
        <p className="mt-1 text-sm text-ink">{event.plannedFood || "Ще се разберем на масата."}</p>
      </div>
    </div>
  );
}
