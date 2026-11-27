import "server-only";

import { and, eq, or } from "drizzle-orm";
import type { PublicEvent } from "@hp1/shared";

import { db } from "@/lib/db";
import { blocks, eventAttendees, events, groupMembers, users } from "@/lib/db/schema";
import { userSummaryColumns } from "@/lib/db/user-summary";

import { canSeePrivateDetails, canViewEvent, type ViewerContext } from "./access";
import { toPublicEvent, type AttendeeRowLike } from "./serialize";

export type EventRow = typeof events.$inferSelect;

export interface EventAccess {
  event: EventRow;
  ctx: ViewerContext;
  canView: boolean;
  /** Organiser or confirmed attendee: address, attendee list, chat, polls, contributions. */
  privateOk: boolean;
  isOrganizer: boolean;
}

/**
 * One event plus everything needed to authorise the viewer. Returns null when
 * the event does not exist OR the viewer may not see it, so callers answer 404
 * in both cases and never reveal that a private event exists.
 *
 * Every route under /api/events/[id]/** starts with this.
 */
export async function getEventAccess(
  eventId: string,
  viewerId: string,
  opts: { inviteCode?: string } = {},
): Promise<EventAccess | null> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return null;

  const [mine] = await db
    .select({ status: eventAttendees.status })
    .from(eventAttendees)
    .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, viewerId)))
    .limit(1);

  const [block] = await db
    .select({ blockerId: blocks.blockerId })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, viewerId), eq(blocks.blockedId, event.organizerId)),
        and(eq(blocks.blockerId, event.organizerId), eq(blocks.blockedId, viewerId)),
      ),
    )
    .limit(1);

  let isGroupMember = false;
  if (event.groupId) {
    const [m] = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, event.groupId), eq(groupMembers.userId, viewerId)))
      .limit(1);
    isGroupMember = Boolean(m);
  }

  const ctx: ViewerContext = {
    viewerId,
    organizerId: event.organizerId,
    isPrivate: event.isPrivate,
    friendsOnly: event.friendsOnly,
    myStatus: mine?.status ?? null,
    isGroupMember,
    viaInvite: Boolean(opts.inviteCode) && opts.inviteCode === event.inviteCode,
    blocked: Boolean(block),
  };
  const canView = canViewEvent(ctx);
  if (!canView) return null;
  return {
    event,
    ctx,
    canView,
    privateOk: canSeePrivateDetails(ctx),
    isOrganizer: viewerId === event.organizerId,
  };
}

/** Loads organiser + attendees and serialises through toPublicEvent(). */
export async function serializeEvent(event: EventRow, viewerId: string): Promise<PublicEvent> {
  const [organizer] = await db.select(userSummaryColumns).from(users).where(eq(users.id, event.organizerId)).limit(1);
  const attendees: AttendeeRowLike[] = await db
    .select({
      ...userSummaryColumns,
      status: eventAttendees.status,
      isOrganizer: eventAttendees.isOrganizer,
      nonAlcoholic: eventAttendees.nonAlcoholic,
      lateMinutes: eventAttendees.lateMinutes,
      excuse: eventAttendees.excuse,
      joinedAt: eventAttendees.joinedAt,
    })
    .from(eventAttendees)
    .innerJoin(users, eq(users.id, eventAttendees.userId))
    .where(eq(eventAttendees.eventId, event.id));
  return toPublicEvent(
    event,
    organizer ?? { id: event.organizerId, nickname: "изтрит участник", avatarInitials: "", avatarColor: "#5D5348", avatarUrl: null, roleId: null },
    attendees,
    viewerId,
  );
}
