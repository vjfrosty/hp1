import "server-only";

import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { CHAT_REACTIONS, MESSAGES_PAGE_SIZE, type ChatMessageDTO, type ReactionDTO, type UserSummary } from "@hp1/shared";

import { db } from "@/lib/db";
import { eventMessages, messageReactions, users } from "@/lib/db/schema";
import { userSummaryColumns } from "@/lib/db/user-summary";
import { notBlockedBy } from "@/lib/social/blocks";

import { aggregateReactions } from "./logic";

type MessageRow = typeof eventMessages.$inferSelect;

const messageColumns = {
  id: eventMessages.id,
  senderId: eventMessages.senderId,
  text: eventMessages.text,
  isSystem: eventMessages.isSystem,
  isPinned: eventMessages.isPinned,
  sticker: eventMessages.sticker,
  locationCard: eventMessages.locationCard,
  createdAt: eventMessages.createdAt,
};

function senderOf(row: { senderId: string | null; sender: UserSummary | null }): UserSummary | null {
  return row.senderId && row.sender?.id ? row.sender : null;
}

function toDTO(
  m: Pick<MessageRow, "id" | "text" | "isSystem" | "isPinned" | "sticker" | "locationCard" | "createdAt">,
  sender: UserSummary | null,
  reactions: ReactionDTO[],
): ChatMessageDTO {
  return {
    id: m.id,
    sender,
    text: m.text,
    createdAt: m.createdAt.toISOString(),
    isSystem: m.isSystem,
    isPinned: m.isPinned,
    sticker: m.sticker,
    locationCard: m.locationCard ?? null,
    reactions,
  };
}

/** Reactions on these messages, aggregated for the viewer; blocked reactors are not counted. */
export async function loadReactions(messageIds: string[], viewerId: string): Promise<Map<string, ReactionDTO[]>> {
  if (messageIds.length === 0) return new Map();
  const rows = await db
    .select({ messageId: messageReactions.messageId, userId: messageReactions.userId, emoji: messageReactions.emoji })
    .from(messageReactions)
    .where(and(inArray(messageReactions.messageId, messageIds), notBlockedBy(viewerId, messageReactions.userId)));
  return aggregateReactions(rows, viewerId, CHAT_REACTIONS);
}

/**
 * Chat for one event, oldest first. Without `after`: the latest page. With
 * `after`: only newer messages (polling). Hidden messages and messages from
 * users the viewer blocks or who block the viewer are excluded in SQL.
 */
export async function listMessages(eventId: string, viewerId: string, after?: Date): Promise<ChatMessageDTO[]> {
  const where = and(
    eq(eventMessages.eventId, eventId),
    isNull(eventMessages.hiddenAt),
    notBlockedBy(viewerId, eventMessages.senderId),
    after ? gt(eventMessages.createdAt, after) : undefined,
  );
  const base = db
    .select({ ...messageColumns, sender: userSummaryColumns })
    .from(eventMessages)
    .leftJoin(users, eq(users.id, eventMessages.senderId))
    .where(where);
  const rows = after
    ? await base.orderBy(asc(eventMessages.createdAt), asc(eventMessages.id)).limit(MESSAGES_PAGE_SIZE)
    : (await base.orderBy(desc(eventMessages.createdAt), desc(eventMessages.id)).limit(MESSAGES_PAGE_SIZE)).reverse();

  const reactions = await loadReactions(
    rows.map((r) => r.id),
    viewerId,
  );
  return rows.map((r) => toDTO(r, senderOf(r), reactions.get(r.id) ?? []));
}

export async function createMessage(input: {
  eventId: string;
  sender: UserSummary;
  text: string;
  sticker: string | null;
  locationCard: { venueName: string; neighborhood: string; city: string } | null;
}): Promise<ChatMessageDTO> {
  const [row] = await db
    .insert(eventMessages)
    .values({
      eventId: input.eventId,
      senderId: input.sender.id,
      text: input.text,
      sticker: input.sticker,
      locationCard: input.locationCard,
    })
    .returning(messageColumns);
  return toDTO(row, input.sender, []);
}

/** A message of this event the viewer can see (not hidden, sender not blocked), or null (404). */
export async function findMessage(eventId: string, messageId: string, viewerId: string) {
  const [row] = await db
    .select({ id: eventMessages.id, senderId: eventMessages.senderId, isSystem: eventMessages.isSystem, isPinned: eventMessages.isPinned })
    .from(eventMessages)
    .where(
      and(
        eq(eventMessages.id, messageId),
        eq(eventMessages.eventId, eventId),
        isNull(eventMessages.hiddenAt),
        notBlockedBy(viewerId, eventMessages.senderId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Toggles the viewer's reaction. Delete-first keeps it race-safe on the PK. */
export async function toggleReaction(messageId: string, userId: string, emoji: string): Promise<void> {
  const removed = await db
    .delete(messageReactions)
    .where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId), eq(messageReactions.emoji, emoji)))
    .returning({ emoji: messageReactions.emoji });
  if (removed.length === 0) {
    await db.insert(messageReactions).values({ messageId, userId, emoji }).onConflictDoNothing();
  }
}

/** Flips is_pinned in one statement and returns the new value. */
export async function togglePin(messageId: string): Promise<boolean> {
  const [row] = await db
    .update(eventMessages)
    .set({ isPinned: sql`not ${eventMessages.isPinned}` })
    .where(eq(eventMessages.id, messageId))
    .returning({ isPinned: eventMessages.isPinned });
  return row?.isPinned ?? false;
}
