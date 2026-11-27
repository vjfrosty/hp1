import "server-only";

import { and, asc, count, desc, eq, exists, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import type { EventScope, PublicEvent, RSVPStatus, UserSummary } from "@hp1/shared";

import { db } from "@/lib/db";
import { eventAttendees, eventMessages, events, groupMembers, users } from "@/lib/db/schema";
import { withTransaction } from "@/lib/db/tx";
import { userSummaryColumns } from "@/lib/db/user-summary";
import { notBlockedBy } from "@/lib/social/blocks";

import type { EventRow } from "./load";
import { decideStatus, hasFreeSeat, takesSeat, type AttendeeDecision } from "./rules";
import { toPublicEvent, type AttendeeRowLike } from "./serialize";

/** Rate-limit presets for event writes that have no entry in LIMITS. */
export const EVENT_WRITE_LIMITS = {
  rsvp: [30, 600],
  organiserAction: [60, 3600],
} as const satisfies Record<string, readonly [number, number]>;

/** Events stay listed until 6 hours after they start. */
const LISTED_AFTER_START_MS = 6 * 3600 * 1000;
/** How far back the `attended` scope looks. */
const ATTENDED_WINDOW_MS = 180 * 86_400_000;
const LIST_LIMIT = 100;

const attendeeColumns = {
  ...userSummaryColumns,
  eventId: eventAttendees.eventId,
  status: eventAttendees.status,
  isOrganizer: eventAttendees.isOrganizer,
  nonAlcoholic: eventAttendees.nonAlcoholic,
  lateMinutes: eventAttendees.lateMinutes,
  excuse: eventAttendees.excuse,
  joinedAt: eventAttendees.joinedAt,
};

const DELETED_USER = (id: string): UserSummary => ({
  id,
  nickname: "изтрит участник",
  avatarInitials: "",
  avatarColor: "#5D5348",
  avatarUrl: null,
  roleId: null,
});

/** Serialises many events with two batch queries (no N+1). */
export async function serializeEvents(rows: EventRow[], viewerId: string): Promise<PublicEvent[]> {
  if (rows.length === 0) return [];
  const eventIds = rows.map((e) => e.id);
  const organizerIds = [...new Set(rows.map((e) => e.organizerId))];
  const [organizers, attendeeRows] = await Promise.all([
    db.select(userSummaryColumns).from(users).where(inArray(users.id, organizerIds)),
    db
      .select(attendeeColumns)
      .from(eventAttendees)
      .innerJoin(users, eq(users.id, eventAttendees.userId))
      .where(inArray(eventAttendees.eventId, eventIds)),
  ]);
  const orgById = new Map(organizers.map((o) => [o.id, o]));
  const byEvent = new Map<string, AttendeeRowLike[]>();
  for (const { eventId, ...a } of attendeeRows) {
    const list = byEvent.get(eventId) ?? [];
    list.push(a);
    byEvent.set(eventId, list);
  }
  return rows.map((e) =>
    toPublicEvent(e, orgById.get(e.organizerId) ?? DELETED_USER(e.organizerId), byEvent.get(e.id) ?? [], viewerId),
  );
}

/**
 * Upcoming events the viewer may see, privacy and blocks applied in SQL
 * (AGENTS.md rules 5 and 6). feed: incl. cancelled (UI shows a banner);
 * radar: active only; mine: organised or RSVP'd (not declined).
 */
export async function listEvents(viewerId: string, opts: { city?: string; scope: EventScope }): Promise<PublicEvent[]> {
  const isAttendee = exists(
    db
      .select({ one: sql`1` })
      .from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, events.id), eq(eventAttendees.userId, viewerId))),
  );
  const isActiveAttendee = exists(
    db
      .select({ one: sql`1` })
      .from(eventAttendees)
      .where(
        and(
          eq(eventAttendees.eventId, events.id),
          eq(eventAttendees.userId, viewerId),
          ne(eventAttendees.status, "declined"),
        ),
      ),
  );
  const isGroupMember = exists(
    db
      .select({ one: sql`1` })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, events.groupId), eq(groupMembers.userId, viewerId))),
  );

  if (opts.scope === "attended") {
    // Same "attended" rule the chronicle API enforces: organiser or confirmed.
    const confirmed = exists(
      db
        .select({ one: sql`1` })
        .from(eventAttendees)
        .where(
          and(eq(eventAttendees.eventId, events.id), eq(eventAttendees.userId, viewerId), eq(eventAttendees.status, "confirmed")),
        ),
    );
    const past = await db
      .select()
      .from(events)
      .where(
        and(
          lte(events.startsAt, new Date()),
          gte(events.startsAt, new Date(Date.now() - ATTENDED_WINDOW_MS)),
          isNull(events.cancelledAt),
          opts.city ? eq(events.city, opts.city) : undefined,
          notBlockedBy(viewerId, events.organizerId),
          or(eq(events.organizerId, viewerId), confirmed),
        ),
      )
      .orderBy(desc(events.startsAt))
      .limit(LIST_LIMIT);
    return serializeEvents(past, viewerId);
  }

  // Same rule as canViewEvent(), minus invite links (never listed).
  const visible =
    opts.scope === "mine"
      ? or(eq(events.organizerId, viewerId), isActiveAttendee)
      : or(
          eq(events.organizerId, viewerId),
          isAttendee,
          and(eq(events.friendsOnly, true), isGroupMember),
          and(eq(events.friendsOnly, false), eq(events.isPrivate, false)),
        );

  const rows = await db
    .select()
    .from(events)
    .where(
      and(
        gte(events.startsAt, new Date(Date.now() - LISTED_AFTER_START_MS)),
        opts.city ? eq(events.city, opts.city) : undefined,
        opts.scope === "radar" ? isNull(events.cancelledAt) : undefined,
        notBlockedBy(viewerId, events.organizerId),
        visible,
      ),
    )
    .orderBy(asc(events.startsAt))
    .limit(LIST_LIMIT);
  return serializeEvents(rows, viewerId);
}

export async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const [m] = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return Boolean(m);
}

/** Attendees to tell about a change or cancellation (not the organiser, not declined). */
export async function activeAttendeeIds(eventId: string, organizerId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: eventAttendees.userId })
    .from(eventAttendees)
    .where(
      and(
        eq(eventAttendees.eventId, eventId),
        inArray(eventAttendees.status, ["confirmed", "maybe", "pending_approval"]),
        ne(eventAttendees.userId, organizerId),
      ),
    );
  return rows.map((r) => r.userId);
}

type Tx = Parameters<Parameters<typeof withTransaction>[0]>[0];

/** Locks the event row so concurrent seat checks serialise. */
async function lockEvent(tx: Tx, eventId: string): Promise<EventRow | undefined> {
  const [row] = await tx.select().from(events).where(eq(events.id, eventId)).for("update").limit(1);
  return row;
}

async function confirmedCount(tx: Tx, eventId: string): Promise<number> {
  const [row] = await tx
    .select({ n: count() })
    .from(eventAttendees)
    .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.status, "confirmed")));
  return Number(row?.n ?? 0);
}

export function systemMessage(tx: Tx, eventId: string, text: string, extra: Partial<typeof eventMessages.$inferInsert> = {}) {
  return tx.insert(eventMessages).values({ eventId, senderId: null, text, isSystem: true, ...extra });
}

export type SeatResult = { ok: true } | { ok: false; reason: "full" | "gone" | "cancelled" | "not_pending" };

/**
 * Stores an RSVP. Capacity is checked and the row written in one transaction,
 * with the event row locked (RECOMMENDATIONS 2.4). `declined` is stored, not
 * deleted, so the excuse stays visible to the table.
 */
export async function storeRsvp(args: {
  eventId: string;
  userId: string;
  current: RSVPStatus | null;
  next: RSVPStatus;
  nonAlcoholic: boolean;
  lateMinutes: number | null;
  excuse: string | null;
  systemText: string;
}): Promise<SeatResult> {
  return withTransaction(async (tx) => {
    const event = await lockEvent(tx, args.eventId);
    if (!event) return { ok: false, reason: "gone" } as const;
    if (event.cancelledAt) return { ok: false, reason: "cancelled" } as const;
    if (takesSeat(args.current, args.next) && !hasFreeSeat(await confirmedCount(tx, args.eventId), event.maxAttendees)) {
      return { ok: false, reason: "full" } as const;
    }
    const values = {
      status: args.next,
      nonAlcoholic: args.nonAlcoholic,
      lateMinutes: args.lateMinutes,
      excuse: args.excuse,
    };
    await tx
      .insert(eventAttendees)
      .values({ eventId: args.eventId, userId: args.userId, isOrganizer: false, ...values })
      .onConflictDoUpdate({ target: [eventAttendees.eventId, eventAttendees.userId], set: values });
    if (args.next !== args.current) await systemMessage(tx, args.eventId, args.systemText);
    return { ok: true } as const;
  });
}

/** Organiser approves or rejects a pending request (capacity-checked on approve). */
export async function storeDecision(args: {
  eventId: string;
  userId: string;
  action: AttendeeDecision;
  systemText: string;
}): Promise<SeatResult> {
  return withTransaction(async (tx) => {
    const event = await lockEvent(tx, args.eventId);
    if (!event) return { ok: false, reason: "gone" } as const;
    if (event.cancelledAt) return { ok: false, reason: "cancelled" } as const;
    const [row] = await tx
      .select({ status: eventAttendees.status })
      .from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, args.eventId), eq(eventAttendees.userId, args.userId)))
      .for("update")
      .limit(1);
    if (!row) return { ok: false, reason: "gone" } as const;
    const next = decideStatus(row.status, args.action);
    if (!next) return { ok: false, reason: "not_pending" } as const;
    if (next === "confirmed" && !hasFreeSeat(await confirmedCount(tx, args.eventId), event.maxAttendees)) {
      return { ok: false, reason: "full" } as const;
    }
    await tx
      .update(eventAttendees)
      .set({ status: next })
      .where(and(eq(eventAttendees.eventId, args.eventId), eq(eventAttendees.userId, args.userId)));
    await systemMessage(tx, args.eventId, args.systemText);
    return { ok: true } as const;
  });
}

export async function nicknameOf(userId: string): Promise<string | null> {
  const [u] = await db.select({ nickname: users.nickname }).from(users).where(eq(users.id, userId)).limit(1);
  return u ? u.nickname || "Участник" : null;
}

