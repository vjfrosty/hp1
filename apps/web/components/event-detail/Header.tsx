import { AlertTriangle, Calendar, Car, Lock, MapPin } from "lucide-react";
import { SEASONAL_THEMES, dateLabel, sofiaTime, type PublicEvent } from "@hp1/shared";

import { freeSeats, hasQuorum } from "./helpers";

const FALLBACK_COVER = "/images/hero_mehana_table_1795110175071.jpg";

/** Cover image, meta line, title, description and seat count. RSVP controls go in `children`. */
export function Header({ event, children }: { event: PublicEvent; children?: React.ReactNode }) {
  const theme = SEASONAL_THEMES[event.seasonalTheme] ?? SEASONAL_THEMES.classic;
  const seats = freeSeats(event.counts.confirmed, event.maxAttendees);
  const when = dateLabel(event.startsAt);

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      {event.isCancelled && (
        <div role="alert" className="flex items-start gap-3 border-b border-burgundy/30 bg-burgundy/10 px-5 py-3.5 text-sm text-burgundy">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-semibold">
            Сбирката е отменена. Заседанието се отлага по независещи от салатата причини.
          </p>
        </div>
      )}
      <div className="grid lg:grid-cols-12">
        <div className="relative min-h-[210px] bg-surface-muted lg:col-span-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- cover may be any uploaded URL */}
          <img
            src={event.coverImageUrl || FALLBACK_COVER}
            alt={event.title}
            referrerPolicy="no-referrer"
            className={`absolute inset-0 h-full w-full object-cover ${event.isCancelled ? "grayscale" : ""}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-canvas">
            <span className="text-xs font-medium">{theme.name}</span>
            {event.isCancelled ? (
              <span className="tavern-stamp bg-surface/95 text-burgundy">ОТМЕНЕНО</span>
            ) : hasQuorum(event) ? (
              <span className="tavern-stamp bg-surface/95 text-tavern">КВОРУМ</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col justify-between p-5 sm:p-7 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1 font-semibold text-ink">
                <MapPin className="h-3.5 w-3.5 text-burgundy" />
                {event.city}, {event.neighborhood}
              </span>
              <span aria-hidden="true">·</span>
              <time dateTime={event.startsAt} className="inline-flex items-center gap-1 font-mono tabular-nums">
                <Calendar className="h-3.5 w-3.5" />
                {when === "минала" ? "мина" : when}, {sofiaTime(event.startsAt)} ч.
              </time>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{event.venueType}</span>
              {event.isPrivate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-medium text-burgundy">
                    <Lock className="h-3 w-3" />
                    Частна сбирка
                  </span>
                </>
              )}
            </div>

            <h1 className="mt-2.5 text-balance font-display text-2xl font-bold text-ink sm:text-3xl">{event.title}</h1>
            <p className="mt-1 text-xs text-ink-muted">Свиква: {event.organizer.nickname}</p>

            {event.description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-muted">{event.description}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line/80 pt-4 text-sm">
              <span className="font-mono font-semibold tabular-nums text-ink">
                {event.counts.confirmed}/{event.maxAttendees} заети стола
              </span>
              {!event.isCancelled && seats === 1 && (
                <span className="font-semibold text-burgundy">Остана един стол. Историята чака.</span>
              )}
              {!event.isCancelled && seats === 0 && <span className="font-semibold text-burgundy">Масата е пълна.</span>}
              {event.nonAlcoholicFriendly && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-tavern">
                  <Car className="h-3.5 w-3.5" />
                  Безалкохолно участие добре дошло
                </span>
              )}
            </div>
          </div>

          {children}
        </div>
      </div>
    </section>
  );
}
