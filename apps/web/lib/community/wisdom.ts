import "server-only";

import type { UserSummary, WisdomDTO } from "@hp1/shared";
import { and, desc, eq, isNotNull, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";
import { groups, users, wisdom } from "@/lib/db/schema";
import { notBlockedBy } from "@/lib/social/blocks";

import { viewerIsMemberOf } from "./groups";
import { canViewWisdom } from "./visibility";

const quoted = alias(users, "quoted_user");

const summary = <T extends typeof users | typeof quoted>(t: T) => ({
  id: t.id,
  nickname: t.nickname,
  avatarInitials: t.avatarInitials,
  avatarColor: t.avatarColor,
  avatarUrl: t.avatarUrl,
  roleId: t.roleId,
});

/** SQL twin of canViewWisdom(). */
function visibleTo(viewerId: string): SQL {
  return and(
    notBlockedBy(viewerId, wisdom.authorId),
    notBlockedBy(viewerId, wisdom.quotedUserId),
    or(
      eq(wisdom.authorId, viewerId),
      eq(wisdom.quotedUserId, viewerId),
      and(
        eq(wisdom.sharedToGroup, true),
        isNotNull(wisdom.groupId),
        viewerIsMemberOf(viewerId, wisdom.groupId),
        // Quotes about someone else need that person's own consent first.
        or(isNull(wisdom.quotedUserId), eq(wisdom.quotedUserId, wisdom.authorId), eq(wisdom.consentGiven, true)),
      ),
    ),
  )!;
}

export async function loadWisdom(
  viewerId: string,
  opts: { id?: string; groupId?: string; before?: Date } = {},
): Promise<WisdomDTO[]> {
  const where: SQL[] = [visibleTo(viewerId)];
  if (opts.id) where.push(eq(wisdom.id, opts.id));
  if (opts.groupId) where.push(eq(wisdom.groupId, opts.groupId));
  if (opts.before) where.push(lt(wisdom.createdAt, opts.before));

  const rows = await db
    .select({
      id: wisdom.id,
      quote: wisdom.quote,
      context: wisdom.context,
      authorId: wisdom.authorId,
      quotedUserId: wisdom.quotedUserId,
      consentGiven: wisdom.consentGiven,
      sharedToGroup: wisdom.sharedToGroup,
      groupId: wisdom.groupId,
      createdAt: wisdom.createdAt,
      groupName: groups.name,
      isGroupMember: sql<boolean>`(${wisdom.groupId} is not null and ${viewerIsMemberOf(viewerId, wisdom.groupId)})`,
      author: summary(users),
      quotedUser: summary(quoted),
    })
    .from(wisdom)
    .leftJoin(users, eq(users.id, wisdom.authorId))
    .leftJoin(quoted, eq(quoted.id, wisdom.quotedUserId))
    .leftJoin(groups, eq(groups.id, wisdom.groupId))
    .where(and(...where))
    .orderBy(desc(wisdom.createdAt))
    .limit(50);

  return rows
    .filter((w) =>
      canViewWisdom({
        viewerId,
        authorId: w.authorId,
        quotedUserId: w.quotedUserId,
        sharedToGroup: w.sharedToGroup,
        groupId: w.groupId,
        consentGiven: w.consentGiven,
        isGroupMember: Boolean(w.isGroupMember),
        blocked: false, // filtered in SQL by notBlockedBy
      }),
    )
    .map((w) => ({
      id: w.id,
      quote: w.quote,
      context: w.context,
      author: (w.authorId && w.author?.id ? w.author : null) as UserSummary | null,
      quotedUser: (w.quotedUserId && w.quotedUser?.id ? w.quotedUser : null) as UserSummary | null,
      consentGiven: w.consentGiven,
      sharedToGroup: w.sharedToGroup,
      groupId: w.groupId,
      groupName: w.groupName ?? null,
      viewerIsAuthor: w.authorId === viewerId,
      createdAt: w.createdAt.toISOString(),
    }));
}
