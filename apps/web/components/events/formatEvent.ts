import type { PublicEvent, VenueType } from "@hp1/shared";
import { dateLabel, sofiaTime } from "@hp1/shared";

/** Stock photos in /public/images, picked by venue type when an event has no cover. */
export const VENUE_COVERS: Record<VenueType, string> = {
  механа: "/images/hero_mehana_table_1795110175071.jpg",
  кръчма: "/images/hero_mehana_table_1795110175071.jpg",
  двор: "/images/gathering_bbq_yard_1795110176773.jpg",
  вила: "/images/gathering_villa_fire_1795110106084.jpg",
  "домашна маса": "/images/gathering_home_table_1795110089598.jpg",
};

export const HERO_IMAGE = "/images/hero_mehana_table_1795110175071.jpg";

export function coverFor(event: Pick<PublicEvent, "coverImageUrl" | "venueType">): string {
  return event.coverImageUrl || VENUE_COVERS[event.venueType] || HERO_IMAGE;
}

const dayFormatter = new Intl.DateTimeFormat("bg-BG", {
  timeZone: "Europe/Sofia",
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** "днес, 19:30" / "утре, 20:00" / "сб, 5 дек., 19:00" in Sofia time. */
export function whenLabel(startsAt: string, now: Date = new Date()): string {
  const label = dateLabel(startsAt, now);
  const time = sofiaTime(startsAt);
  if (label === "днес" || label === "утре" || label === "уикенда") return `${label}, ${time}`;
  return `${dayFormatter.format(new Date(startsAt))}, ${time}`;
}

export function freeSeats(event: Pick<PublicEvent, "maxAttendees" | "counts">): number {
  return Math.max(0, event.maxAttendees - event.counts.confirmed);
}

/** Legacy rule: three confirmed people make a quorum. */
export function hasQuorum(event: Pick<PublicEvent, "counts" | "isCancelled">): boolean {
  return !event.isCancelled && event.counts.confirmed >= 3;
}
