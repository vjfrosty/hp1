/**
 * Pure event-domain rules ported from the legacy store (createEvent, setRSVP,
 * approveAttendee, changeEventVenue). No DB, no "server-only": the server
 * routes and the optimistic client hooks share them, and tests cover them.
 */
import { DEFAULT_MEZE_TASKS, type CreateEventData, type PublicEvent, type RSVPStatus, type VenueType } from "@hp1/shared";

// ─── RSVP ─────────────────────────────────────────────────────────────────────

export type RequestedRsvp = Exclude<RSVPStatus, "pending_approval">;

/**
 * The status actually stored for a request. With manual approval, a new
 * "confirmed" becomes "pending_approval" until the organiser decides; someone
 * already confirmed stays confirmed (e.g. only updating lateMinutes).
 */
export function nextRsvpStatus(manualApproval: boolean, current: RSVPStatus | null, requested: RequestedRsvp): RSVPStatus {
  if (requested === "confirmed" && manualApproval && current !== "confirmed") return "pending_approval";
  return requested;
}

/** Does moving from `current` to `next` take a new seat? */
export function takesSeat(current: RSVPStatus | null, next: RSVPStatus): boolean {
  return next === "confirmed" && current !== "confirmed";
}

/**
 * Capacity decision. `confirmedCount` is every confirmed row of the event,
 * organiser included (the organiser takes a seat too).
 */
export function hasFreeSeat(confirmedCount: number, maxAttendees: number): boolean {
  return confirmedCount < maxAttendees;
}

/** Notify the organiser only on the first knock, not on repeated requests. */
export function shouldNotifyOrganizer(current: RSVPStatus | null, next: RSVPStatus): boolean {
  return next === "pending_approval" && current !== "pending_approval";
}

/** System chat line for an RSVP (legacy setRSVP texts). */
export function rsvpSystemText(nickname: string, next: RSVPStatus, opts: { lateMinutes?: number; excuse?: string } = {}): string {
  switch (next) {
    case "confirmed":
      return opts.lateMinutes
        ? `${nickname} пак е на ${opts.lateMinutes} минути.`
        : `${nickname} потвърди. Събранието става сериозно.`;
    case "pending_approval":
      return `${nickname} почука на вратата и чака одобрение от организатора.`;
    case "maybe":
      return `${nickname} каза „Ще видим“ (без запазен стол).`;
    case "declined":
      return `${nickname} пропуска: „${opts.excuse || "Ще обясня на следващото заседание."}“`;
  }
}

export type AttendeeDecision = "approve" | "reject";

/** Organiser decision on a join request. Only pending requests can be decided. */
export function decideStatus(current: RSVPStatus | null, action: AttendeeDecision): RSVPStatus | null {
  if (current !== "pending_approval") return null;
  return action === "approve" ? "confirmed" : "declined";
}

export function decisionTexts(nickname: string, action: AttendeeDecision) {
  return action === "approve"
    ? {
        chat: `${nickname} е одобрен. Кворумът и достъпът до адреса са отворени.`,
        title: "Одобрен достъп до сбирката",
        body: "Точният адрес и груповият чат вече са отключени.",
      }
    : {
        chat: `Заявката на ${nickname} не беше одобрена.`,
        title: "Отказана заявка",
        body: "Организаторът отказа заявката за присъединяване.",
      };
}

/**
 * Optimistic client view of an RSVP. Mirrors the server decision except the
 * capacity check, which only the server can make (it rolls back on 409).
 */
export function applyOptimisticRsvp(event: PublicEvent, requested: RequestedRsvp): PublicEvent {
  const current = event.myStatus;
  const next = nextRsvpStatus(event.manualApproval, current, requested);
  const counts = { ...event.counts };
  const bump = (s: RSVPStatus | null, d: number) => {
    if (s === "confirmed") counts.confirmed += d;
    else if (s === "maybe") counts.maybe += d;
    else if (s === "pending_approval") counts.pending += d;
  };
  bump(current, -1);
  bump(next, +1);
  return { ...event, myStatus: next, counts };
}

// ─── create ───────────────────────────────────────────────────────────────────

const COVER_BY_VENUE: Record<VenueType, string> = {
  механа: "/images/hero_mehana_table_1795110175071.jpg",
  кръчма: "/images/hero_mehana_table_1795110175071.jpg",
  двор: "/images/gathering_bbq_yard_1795110176773.jpg",
  вила: "/images/gathering_villa_fire_1795110106084.jpg",
  "домашна маса": "/images/gathering_home_table_1795110089598.jpg",
};

/** Insert values for a validated create body, with the legacy defaults. */
export function normalizeCreateEvent(input: CreateEventData, point: { lat: number; lng: number }) {
  return {
    title: input.title.trim(),
    description: input.description.trim() || "Спокойна мъжка сбирка на добра маса и разговор.",
    startsAt: new Date(input.startsAt),
    city: input.city,
    neighborhood: input.neighborhood,
    venueName: input.venueName.trim() || `${input.venueType} в ${input.neighborhood}`,
    exactAddress: input.exactAddress.trim() || `${input.city}, кв. ${input.neighborhood} (детайли в чата)`,
    venueType: input.venueType,
    // District centre only, never client GPS (AGENTS.md rule 4).
    approxLat: point.lat,
    approxLng: point.lng,
    maxAttendees: input.maxAttendees,
    isPrivate: input.isPrivate,
    manualApproval: input.manualApproval,
    friendsOnly: input.friendsOnly && Boolean(input.groupId),
    plannedFood: input.plannedFood.trim() || "Шопска салата, сирене и скара",
    nonAlcoholicFriendly: input.nonAlcoholicFriendly,
    seasonalTheme: input.seasonalTheme,
    coverImageUrl: input.coverImageUrl || COVER_BY_VENUE[input.venueType],
    groupId: input.groupId ?? null,
  };
}

/** Contributions seeded on create (legacy: the first six default tasks). */
export function defaultContributions() {
  return DEFAULT_MEZE_TASKS.slice(0, 6).map((t) => ({ item: t.item, category: t.category }));
}

export const createdSystemText = (nickname: string) => `${nickname} свика дружината. Масата чака кворум!`;
export const CANCEL_TEXT = "Заседанието се отлага по независещи от салатата причини.";

// ─── change ───────────────────────────────────────────────────────────────────

export interface EditableEventFields {
  venueName: string;
  exactAddress: string;
  city: string;
  neighborhood: string;
  startsAt: Date;
  description: string;
}

export interface EventChange {
  chatText: string;
  title: string;
  body: string;
  /** Pin the message and attach a location card (venue changes). */
  venueChanged: boolean;
  locationCard: { venueName: string; neighborhood: string; city: string } | null;
}

export function formatSofiaDateTime(d: Date): string {
  return new Intl.DateTimeFormat("bg-BG", {
    timeZone: "Europe/Sofia",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * What the attendees are told about an organiser edit (legacy
 * changeEventVenue text for venue changes). null when nothing changed.
 */
export function describeEventChange(before: EditableEventFields, after: EditableEventFields): EventChange | null {
  const venueChanged =
    before.venueName !== after.venueName ||
    before.exactAddress !== after.exactAddress ||
    before.city !== after.city ||
    before.neighborhood !== after.neighborhood;
  const timeChanged = before.startsAt.getTime() !== after.startsAt.getTime();
  const descriptionChanged = before.description !== after.description;
  if (!venueChanged && !timeChanged && !descriptionChanged) return null;

  const chat: string[] = [];
  const body: string[] = [];
  if (venueChanged) {
    chat.push(`Мястото е сменено на „${after.venueName}“. Никой да не тръгва по стария адрес!`);
    body.push(`Новото място е „${after.venueName}“. Никой да не тръгва по стария адрес!`);
  }
  if (timeChanged) {
    const when = formatSofiaDateTime(after.startsAt);
    chat.push(`Часът е сменен: ${when}.`);
    body.push(`Новият час е ${when}.`);
  }
  if (descriptionChanged && !venueChanged && !timeChanged) {
    chat.push("Организаторът обнови описанието на сбирката.");
    body.push("Организаторът обнови описанието на сбирката.");
  }
  const title = venueChanged ? "Смяна на мястото!" : timeChanged ? "Промяна в часа" : "Промяна в сбирката";
  return {
    chatText: chat.join(" "),
    title,
    body: body.join(" "),
    venueChanged,
    locationCard: venueChanged ? { venueName: after.venueName, neighborhood: after.neighborhood, city: after.city } : null,
  };
}
