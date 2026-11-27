import "server-only";

import type { GroupDTO, QuorumSlotDTO, UserSummary } from "@hp1/shared";
import { and, asc, desc, eq, gt, inArray, isNull, lte, sql, type AnyColumn, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { groupMembers, groups, notifications, quorumSlots, quorumVotes, users } from "@/lib/db/schema";
import { withTransaction } from "@/lib/db/tx";
import { userSummaryColumns } from "@/lib/db/user-summary";
import { notBlockedBy } from "@/lib/social/blocks";

import { quorumNotification, quorumReachedNow } from "./quorum";

const MEMBER_PREVIEW = 12;

/** SQL: the viewer belongs to the group whose id column is given. */
export function viewerIsMemberOf(viewerId: string, groupIdColumn: SQL | AnyColumn): SQL<boolean> {
  return sql<boolean>`exists (
    select 1 from ${groupMembers}
    where ${groupMembers.groupId} = ${groupIdColumn} and ${groupMembers.userId} = ${viewerId}
  )`;
}

export async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ one: sql`1` })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

/**
 * Groups as GroupDTOs for one viewer. memberCount and members are computed
 * from group_members; members hide anyone in a block with the viewer.
 */
export async function loadGroups(viewerId: string, filter: { ids?: string[]; city?: string }): Promise<GroupDTO[]> {
  if (filter.ids && filter.ids.length === 0) return [];
  const where: SQL[] = [];
  if (filter.ids) where.push(inArray(groups.id, filter.ids));
  if (filter.city) where.push(eq(groups.city, filter.city));

  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      motto: groups.motto,
      city: groups.city,
      regularSchedule: groups.regularSchedule,
      quorumRequired: groups.quorumRequired,
      meetingsHeld: groups.meetingsHeld,
      memberCount: sql<number>`(select count(*)::int from ${groupMembers} where ${groupMembers.groupId} = ${groups.id})`,
      isMember: viewerIsMemberOf(viewerId, groups.id),
    })
    .from(groups)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(groups.createdAt))
    .limit(100);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const ranked = db
    .select({
      groupId: groupMembers.groupId,
      ...userSummaryColumns,
      rn: sql<number>`row_number() over (partition by ${groupMembers.groupId} order by ${groupMembers.joinedAt})`.as("rn"),
    })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(and(inArray(groupMembers.groupId, ids), isNull(users.deletedAt), notBlockedBy(viewerId, groupMembers.userId)))
    .as("ranked");
  const memberRows = await db.select().from(ranked).where(lte(ranked.rn, MEMBER_PREVIEW)).orderBy(asc(ranked.rn));

  const slotRows = await db
    .select({
      id: quorumSlots.id,
      groupId: quorumSlots.groupId,
      label: quorumSlots.label,
      startsAt: quorumSlots.startsAt,
      votes: sql<number>`(select count(*)::int from ${quorumVotes} where ${quorumVotes.slotId} = ${quorumSlots.id})`,
      mine: sql<boolean>`exists (select 1 from ${quorumVotes} where ${quorumVotes.slotId} = ${quorumSlots.id} and ${quorumVotes.userId} = ${viewerId})`,
    })
    .from(quorumSlots)
    .where(and(inArray(quorumSlots.groupId, ids), gt(quorumSlots.startsAt, sql`now() - interval '12 hours'`)))
    .orderBy(asc(quorumSlots.startsAt))
    .limit(500);

  const membersBy = new Map<string, UserSummary[]>();
  for (const m of memberRows) {
    const list = membersBy.get(m.groupId) ?? [];
    list.push({
      id: m.id,
      nickname: m.nickname,
      avatarInitials: m.avatarInitials,
      avatarColor: m.avatarColor,
      avatarUrl: m.avatarUrl,
      roleId: m.roleId,
    });
    membersBy.set(m.groupId, list);
  }
  const required = new Map(rows.map((r) => [r.id, r.quorumRequired]));
  const slotsBy = new Map<string, QuorumSlotDTO[]>();
  for (const s of slotRows) {
    const list = slotsBy.get(s.groupId) ?? [];
    const votes = Number(s.votes);
    list.push({
      id: s.id,
      label: s.label,
      startsAt: new Date(s.startsAt).toISOString(),
      votes,
      mine: Boolean(s.mine),
      reached: votes >= (required.get(s.groupId) ?? Infinity),
    });
    slotsBy.set(s.groupId, list);
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    motto: r.motto,
    city: r.city,
    regularSchedule: r.regularSchedule,
    quorumRequired: r.quorumRequired,
    meetingsHeld: r.meetingsHeld,
    memberCount: Number(r.memberCount),
    members: membersBy.get(r.id) ?? [],
    isMember: Boolean(r.isMember),
    quorumSlots: slotsBy.get(r.id) ?? [],
  }));
}

export async function loadGroup(viewerId: string, id: string): Promise<GroupDTO | null> {
  const [g] = await loadGroups(viewerId, { ids: [id] });
  return g ?? null;
}

export async function groupExists(id: string): Promise<boolean> {
  const rows = await db.select({ id: groups.id }).from(groups).where(eq(groups.id, id)).limit(1);
  return rows.length > 0;
}

export async function memberIds(groupId: string): Promise<string[]> {
  const rows = await db.select({ userId: groupMembers.userId }).from(groupMembers).where(eq(groupMembers.groupId, groupId));
  return rows.map((r) => r.userId);
}

export type VoteOutcome =
  | { status: "not_found" }
  | { status: "not_member" }
  | { status: "ok"; voted: boolean; notify: { userIds: string[]; title: string; body: string } | null };

/**
 * Toggles the viewer's vote on one slot. The slot row is locked FOR UPDATE, so
 * concurrent votes are serialised and only one of them sees the transition
 * from "below quorum" to "quorum reached".
 *
 * "First time" is detected without a schema column: a quorum notification
 * with the same body (group, slot label, time) already sent means the slot
 * reached quorum before, so un-voting and re-voting does not spam members.
 */
export async function toggleQuorumVote(groupId: string, slotId: string, userId: string): Promise<VoteOutcome> {
  return withTransaction(async (tx): Promise<VoteOutcome> => {
    const [slot] = await tx
      .select({ id: quorumSlots.id, label: quorumSlots.label, startsAt: quorumSlots.startsAt })
      .from(quorumSlots)
      .where(and(eq(quorumSlots.id, slotId), eq(quorumSlots.groupId, groupId)))
      .for("update");
    if (!slot) return { status: "not_found" };

    const [group] = await tx
      .select({ name: groups.name, quorumRequired: groups.quorumRequired })
      .from(groups)
      .where(eq(groups.id, groupId));
    if (!group) return { status: "not_found" };

    const member = await tx
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    if (member.length === 0) return { status: "not_member" };

    const [counted] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(quorumVotes)
      .where(eq(quorumVotes.slotId, slotId));
    const before = Number(counted?.n ?? 0);

    const removed = await tx
      .delete(quorumVotes)
      .where(and(eq(quorumVotes.slotId, slotId), eq(quorumVotes.userId, userId)))
      .returning({ userId: quorumVotes.userId });
    const voted = removed.length === 0;
    if (voted) await tx.insert(quorumVotes).values({ slotId, userId }).onConflictDoNothing();
    const after = before + (voted ? 1 : -1);

    if (!quorumReachedNow(before, after, group.quorumRequired)) return { status: "ok", voted, notify: null };

    const text = quorumNotification(group.name, slot.label, slot.startsAt);
    const members = await tx
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
    const userIds = members.map((m) => m.userId);
    const already = await tx
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(eq(notifications.type, "quorum"), eq(notifications.body, text.body), inArray(notifications.userId, userIds)),
      )
      .limit(1);
    if (already.length > 0) return { status: "ok", voted, notify: null };
    return { status: "ok", voted, notify: { userIds, ...text } };
  });
}
