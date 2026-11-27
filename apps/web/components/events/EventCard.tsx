"use client";

import Link from "next/link";
import { Calendar, Car, Lock, MapPin, Users } from "lucide-react";
import type { PublicEvent, RsvpInput } from "@hp1/shared";

import { useRsvp } from "@/hooks/api/events";
import { useToast } from "@/components/ui/toast";
import { Avatar } from "./Avatar";
import { coverFor, freeSeats, hasQuorum, whenLabel } from "./formatEvent";

/**
 * Feed card for one gathering (ported from legacy FeedView). Quick RSVP goes
 * through `useRsvp`, which updates every cached list optimistically.
 */
export function EventCard({ event, showActions = true }: { event: PublicEvent; showActions?: boolean }) {
  const href = `/events/${event.id}`;
  const seats = freeSeats(event);
  const quorum = hasQuorum(event);
  const status = event.myStatus;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border bg-surface transition-colors ${
        event.isCancelled ? "border-burgundy/30 opacity-80" : "border-line hover:border-tavern/50"
      }`}
    >
      <Link
        href={href}
        className="relative block aspect-[16/9] w-full overflow-hidden bg-surface-muted focus-visible:outline-2 focus-visible:outline-tavern"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- covers can be external https URLs */}
        <img
          src={coverFor(event)}
          alt={event.title}
          referrerPolicy="no-referrer"
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02] ${event.isCancelled ? "grayscale" : ""}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2 text-canvas">
          <span className="text-xs font-medium">
            {event.venueName ? `${event.venueName} · ` : ""}
            {event.venueType}
          </span>
          {event.isCancelled ? (
            <span className="tavern-stamp bg-surface/90 text-burgundy">ОТМЕНЕНО</span>
          ) : quorum ? (
            <span className="tavern-stamp bg-surface/90 text-tavern">КВОРУМ</span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1 font-medium text-ink">
            <MapPin className="h-3.5 w-3.5 text-burgundy" aria-hidden="true" />
            {event.city}, {event.neighborhood}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            {whenLabel(event.startsAt)}
          </span>
          {(event.isPrivate || event.friendsOnly) && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-burgundy">
                <Lock className="h-3 w-3" aria-hidden="true" />
                {event.friendsOnly ? "За дружината" : "Частна"}
              </span>
            </>
          )}
        </div>

        <Link href={href} className="mt-2 text-left">
          <h3
            className={`font-display text-xl font-bold leading-snug transition-colors hover:text-tavern ${
              event.isCancelled ? "text-ink-muted line-through decoration-burgundy/60" : "text-ink"
            }`}
          >
            {event.title}
          </h3>
        </Link>

        {event.isCancelled ? (
          <p className="mt-2 text-sm font-medium text-burgundy">
            Заседанието се отлага по независещи от салатата причини.
          </p>
        ) : (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">{event.description}</p>
        )}

        <div className="mt-4 space-y-1.5 border-t border-line/70 pt-3 text-xs">
          <div className="flex items-center justify-between gap-2 text-ink">
            <span className="inline-flex items-center gap-1.5 text-ink-muted">
              <Avatar user={event.organizer} size="sm" />
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Организатор: <strong className="text-ink">{event.organizer.nickname}</strong>
            </span>
            <span className="font-mono font-semibold tabular-nums">
              {event.counts.confirmed}/{event.maxAttendees} места
            </span>
          </div>

          {!event.isCancelled && seats === 1 && (
            <p className="font-semibold text-burgundy">Остана един стол. Историята чака.</p>
          )}

          {event.nonAlcoholicFriendly && (
            <p className="inline-flex items-center gap-1.5 text-tavern">
              <Car className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Безалкохолни напитки и шофьори — добре дошли</span>
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 pt-1">
          {showActions && !event.isCancelled && !event.viewerIsOrganizer && (
            <QuickRsvp event={event} seats={seats} status={status} />
          )}
          <Link
            href={href}
            className="inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-muted"
          >
            Детайли и чат
          </Link>
        </div>
      </div>
    </article>
  );
}

function QuickRsvp({ event, seats, status }: { event: PublicEvent; seats: number; status: PublicEvent["myStatus"] }) {
  const rsvp = useRsvp(event.id);
  const { show, showError } = useToast();

  const send = (next: RsvpInput["status"]) => {
    if (status === next) return;
    rsvp.mutate(
      { status: next },
      {
        onSuccess: (updated) => {
          if (updated.myStatus === "pending_approval") show("Заявката е изпратена. Домакинът ще те одобри.", "success");
          else if (updated.myStatus === "confirmed") show("Записан си! Шопската те чака.", "success");
          else if (updated.myStatus === "maybe") show("Отбелязано: ще видим.", "info");
        },
        onError: showError,
      },
    );
  };

  const goingLabel =
    status === "confirmed"
      ? "Идваш ✓"
      : status === "pending_approval"
        ? "Чака одобрение"
        : event.manualApproval
          ? "Искам да дойда"
          : "Идвам!";

  return (
    <>
      <button
        type="button"
        onClick={() => send("confirmed")}
        disabled={rsvp.isPending || status === "pending_approval" || (seats === 0 && status !== "confirmed")}
        aria-pressed={status === "confirmed"}
        className={`min-h-[44px] flex-1 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors ${
          status === "pending_approval"
            ? "bg-brass text-surface"
            : "bg-tavern text-canvas hover:bg-tavern-hover disabled:opacity-40"
        }`}
      >
        {seats === 0 && !status ? "Пълна маса" : goingLabel}
      </button>
      <button
        type="button"
        onClick={() => send("maybe")}
        disabled={rsvp.isPending}
        aria-pressed={status === "maybe"}
        className={`min-h-[44px] whitespace-nowrap rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
          status === "maybe" ? "border-ink bg-surface-muted text-ink" : "border-line bg-canvas text-ink-muted hover:text-ink"
        }`}
      >
        Ще видим
      </button>
    </>
  );
}

/** Placeholder card while the feed loads. */
export function EventCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-line bg-surface" aria-hidden="true">
      <div className="aspect-[16/9] w-full bg-surface-muted" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-2/3 rounded bg-surface-muted" />
        <div className="h-5 w-4/5 rounded bg-surface-muted" />
        <div className="h-3 w-full rounded bg-surface-muted" />
        <div className="h-11 w-full rounded-xl bg-surface-muted" />
      </div>
    </div>
  );
}
