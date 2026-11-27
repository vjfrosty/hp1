import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";
import type { ContributionCategory, ContributionDTO, UserSummary } from "@hp1/shared";

import { db } from "@/lib/db";
import { contributions, users } from "@/lib/db/schema";
import { userSummaryColumns } from "@/lib/db/user-summary";

import type { ContributionState } from "./logic";

const columns = {
  id: contributions.id,
  item: contributions.item,
  category: contributions.category,
  status: contributions.status,
  assigneeId: contributions.assignedToUserId,
  assignee: userSummaryColumns,
};

type Row = {
  id: string;
  item: string;
  category: string;
  status: ContributionDTO["status"];
  assigneeId: string | null;
  assignee: UserSummary | null;
};

function toDTO(r: Row): ContributionDTO {
  return {
    id: r.id,
    item: r.item,
    category: r.category as ContributionCategory,
    status: r.status,
    assignee: r.assigneeId && r.assignee?.id ? r.assignee : null,
  };
}

function select() {
  return db.select(columns).from(contributions).leftJoin(users, eq(users.id, contributions.assignedToUserId));
}

/** Meze list in the order items were added (legacy appends). */
export async function listContributions(eventId: string): Promise<ContributionDTO[]> {
  const rows = await select()
    .where(eq(contributions.eventId, eventId))
    .orderBy(asc(contributions.createdAt), asc(contributions.id));
  return rows.map(toDTO);
}

export async function getContribution(eventId: string, id: string): Promise<ContributionDTO | null> {
  const [row] = await select()
    .where(and(eq(contributions.id, id), eq(contributions.eventId, eventId)))
    .limit(1);
  return row ? toDTO(row) : null;
}

/** Raw state for the transition rules. */
export async function getContributionState(eventId: string, id: string): Promise<ContributionState | null> {
  const [row] = await db
    .select({ status: contributions.status, assigneeId: contributions.assignedToUserId })
    .from(contributions)
    .where(and(eq(contributions.id, id), eq(contributions.eventId, eventId)))
    .limit(1);
  return row ?? null;
}

export async function addContribution(eventId: string, item: string, category: ContributionCategory): Promise<ContributionDTO> {
  const [row] = await db.insert(contributions).values({ eventId, item, category }).returning({ id: contributions.id });
  return { id: row.id, item, category, status: "free", assignee: null };
}

/**
 * Compare-and-set: applies `next` only if the row still has state `prev`, so two
 * people claiming the same free item at once cannot both win. False on a lost race.
 */
export async function moveContribution(id: string, prev: ContributionState, next: ContributionState): Promise<boolean> {
  const rows = await db
    .update(contributions)
    .set({ status: next.status, assignedToUserId: next.assigneeId })
    .where(
      and(
        eq(contributions.id, id),
        eq(contributions.status, prev.status),
        prev.assigneeId === null ? isNull(contributions.assignedToUserId) : eq(contributions.assignedToUserId, prev.assigneeId),
      ),
    )
    .returning({ id: contributions.id });
  return rows.length > 0;
}
