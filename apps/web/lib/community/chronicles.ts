import "server-only";

import type { ChronicleDTO, ChronicleVisibility, UserSummary } from "@hp1/shared";
import { and, desc, eq, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { chronicleLikes, chronicles, chronicleTags, eventAttendees, events, groups, users } from "@/lib/db/schema";
import { userSummaryColumns } from "@/lib/db/user-summary";
import { notBlockedBy } from "@/lib/social/blocks";

import { viewerIsMemberOf } from "./groups";
import { canViewChronicle, visibleTags, type TagRowLike } from "./visibility";

/** Per-row viewer relations, as SQL, shared by WHERE and SELECT. */
function relations(viewerId: string) {
  return {
    isGroupMember: sql<boolean>`(${chronicles.groupId} is not null and ${viewerIsMemberOf(viewerId, chronicles.groupId)})`,
    isTagged: sql<boolean>`exists (
      select 1 from ${chronicleTags}
      where ${chronicleTags.chronicleId} = ${chronicles.id} and ${chronicleTags.userId} = ${viewerId}
    )`,
    myTagPending: sql<boolean>`exists (
      select 1 from ${chronicleTags}
      where ${chronicleTags.chronicleId} = ${chronicles.id} and ${chronicleTags.userId} = ${viewerId}
        and ${chronicleTags.consentGivenAt} is null
    )`,
    attendedEvent: sql<boolean>`(${chronicles.eventId} is not null and (
      exists (select 1 from ${events} where ${events.id} = ${chronicles.eventId} and ${events.organizerId} = ${viewerId})
      or exists (
        select 1 from ${eventAttendees}
        where ${eventAttendees.eventId} = ${chronicles.eventId} and ${eventAttendees.userId} = ${viewerId}
          and ${eventAttendees.status} = 'confirmed'
      )
    ))`,
  };
}

/** SQL twin of canViewChronicle(): hidden and blocked authors are excluded here. */
function visibleTo(viewerId: string): SQL {
  const r = relations(viewerId);
  return and(
    isNull(chronicles.hiddenAt),
    notBlockedBy(viewerId, chronicles.authorId),
    or(
      eq(chronicles.authorId, viewerId),
      eq(chronicles.visibility, "public"),
      and(eq(chronicles.visibility, "group"), r.isGroupMember),
      and(eq(chronicles.visibility, "friends"), or(r.isTagged, r.attendedEvent)),
    ),
  )!;
}

export async function loadChronicles(
  viewerId: string,
  opts: { ids?: string[]; before?: Date; groupId?: string; limit?: number } = {},
): Promise<ChronicleDTO[]> {
  if (opts.ids && opts.ids.length === 0) return [];
  const r = relations(viewerId);
  const where: SQL[] = [visibleTo(viewerId)];
  if (opts.ids) where.push(inArray(chronicles.id, opts.ids));
  if (opts.before) where.push(lt(chronicles.createdAt, opts.before));
  if (opts.groupId) where.push(eq(chronicles.groupId, opts.groupId));

  const rows = await db
    .select({
      id: chronicles.id,
      title: chronicles.title,
      city: chronicles.city,
      officialDecision: chronicles.officialDecision,
      story: chronicles.story,
      photoUrl: chronicles.photoUrl,
      visibility: chronicles.visibility,
      consentConfirmed: chronicles.consentConfirmed,
      eventId: chronicles.eventId,
      groupId: chronicles.groupId,
      authorId: chronicles.authorId,
      hiddenAt: chronicles.hiddenAt,
      createdAt: chronicles.createdAt,
      groupName: groups.name,
      author: userSummaryColumns,
      likes: sql<number>`(select count(*)::int from ${chronicleLikes} where ${chronicleLikes.chronicleId} = ${chronicles.id})`,
      likedByMe: sql<boolean>`exists (
        select 1 from ${chronicleLikes}
        where ${chronicleLikes.chronicleId} = ${chronicles.id} and ${chronicleLikes.userId} = ${viewerId}
      )`,
      ...r,
    })
    .from(chronicles)
    .leftJoin(users, eq(users.id, chronicles.authorId))
    .leftJoin(groups, eq(groups.id, chronicles.groupId))
    .where(and(...where))
    .orderBy(desc(chronicles.createdAt))
    .limit(Math.min(opts.limit ?? 30, 50));

  // Second check with the tested pure rule; SQL should already agree.
  const visible = rows.filter((row) =>
    canViewChronicle({
      viewerId,
      authorId: row.authorId,
      visibility: row.visibility as ChronicleVisibility,
      hidden: row.hiddenAt !== null,
      authorBlocked: false, // filtered in SQL by notBlockedBy
      isGroupMember: Boolean(row.isGroupMember),
      isTagged: Boolean(row.isTagged),
      attendedEvent: Boolean(row.attendedEvent),
    }),
  );
  if (visible.length === 0) return [];

  const tagRows = await db
    .select({ chronicleId: chronicleTags.chronicleId, consentGivenAt: chronicleTags.consentGivenAt, ...userSummaryColumns })
    .from(chronicleTags)
    .innerJoin(users, eq(users.id, chronicleTags.userId))
    .where(
      and(
        inArray(
          chronicleTags.chronicleId,
          visible.map((v) => v.id),
        ),
        isNull(users.deletedAt),
        notBlockedBy(viewerId, chronicleTags.userId),
      ),
    );
  const tagsBy = new Map<string, TagRowLike[]>();
  for (const t of tagRows) {
    const list = tagsBy.get(t.chronicleId) ?? [];
    list.push(t);
    tagsBy.set(t.chronicleId, list);
  }

  return visible.map((row) => {
    const author: UserSummary | null = row.authorId && row.author?.id ? row.author : null;
    return {
      id: row.id,
      title: row.title,
      city: row.city,
      officialDecision: row.officialDecision,
      story: row.story,
      photoUrl: row.photoUrl,
      visibility: row.visibility as ChronicleVisibility,
      consentConfirmed: row.consentConfirmed,
      eventId: row.eventId,
      groupId: row.groupId,
      groupName: row.groupName ?? null,
      author,
      tagged: visibleTags(tagsBy.get(row.id) ?? [], viewerId, row.authorId),
      likes: Number(row.likes),
      likedByMe: Boolean(row.likedByMe),
      viewerIsAuthor: row.authorId === viewerId,
      myTagPending: Boolean(row.myTagPending),
      createdAt: row.createdAt.toISOString(),
    };
  });
}

export async function loadChronicle(viewerId: string, id: string): Promise<ChronicleDTO | null> {
  const [c] = await loadChronicles(viewerId, { ids: [id], limit: 1 });
  return c ?? null;
}

/** The viewer organised the event or is a confirmed attendee. */
export async function attendedEvent(eventId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ one: sql`1` })
    .from(events)
    .leftJoin(eventAttendees, and(eq(eventAttendees.eventId, events.id), eq(eventAttendees.userId, userId)))
    .where(and(eq(events.id, eventId), or(eq(events.organizerId, userId), eq(eventAttendees.status, "confirmed"))))
    .limit(1);
  return rows.length > 0;
}

/** Toggles the like. Caller has checked the viewer may see the chronicle. */
export async function toggleLike(chronicleId: string, userId: string): Promise<{ liked: boolean; likes: number }> {
  const removed = await db
    .delete(chronicleLikes)
    .where(and(eq(chronicleLikes.chronicleId, chronicleId), eq(chronicleLikes.userId, userId)))
    .returning({ userId: chronicleLikes.userId });
  const liked = removed.length === 0;
  if (liked) await db.insert(chronicleLikes).values({ chronicleId, userId }).onConflictDoNothing();
  const [c] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(chronicleLikes)
    .where(eq(chronicleLikes.chronicleId, chronicleId));
  return { liked, likes: Number(c?.n ?? 0) };
}
