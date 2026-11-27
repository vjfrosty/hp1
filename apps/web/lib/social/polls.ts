import "server-only";

import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import type { PollDTO } from "@hp1/shared";

import { db } from "@/lib/db";
import { pollOptions, polls, pollVotes, users } from "@/lib/db/schema";
import { userSummaryColumns } from "@/lib/db/user-summary";
import { notBlockedBy } from "@/lib/social/blocks";

/**
 * Polls of one event (newest first, like the legacy app) with per-option counts
 * and the viewer's own choice. Voter identities never leave the server. Polls
 * created by users in a block relation with the viewer are hidden.
 */
export async function listPolls(eventId: string, viewerId: string, onlyPollId?: string): Promise<PollDTO[]> {
  const pollRows = await db
    .select({
      id: polls.id,
      question: polls.question,
      isOfficialCourt: polls.isOfficialCourt,
      createdAt: polls.createdAt,
      createdById: polls.createdBy,
      createdBy: userSummaryColumns,
    })
    .from(polls)
    .leftJoin(users, eq(users.id, polls.createdBy))
    .where(
      and(eq(polls.eventId, eventId), notBlockedBy(viewerId, polls.createdBy), onlyPollId ? eq(polls.id, onlyPollId) : undefined),
    )
    .orderBy(desc(polls.createdAt), desc(polls.id));
  if (pollRows.length === 0) return [];
  const ids = pollRows.map((p) => p.id);

  const [options, counts, mine] = await Promise.all([
    db
      .select({ id: pollOptions.id, pollId: pollOptions.pollId, label: pollOptions.label })
      .from(pollOptions)
      .where(inArray(pollOptions.pollId, ids))
      .orderBy(asc(pollOptions.position), asc(pollOptions.id)),
    db
      .select({ optionId: pollVotes.optionId, votes: count() })
      .from(pollVotes)
      .where(inArray(pollVotes.pollId, ids))
      .groupBy(pollVotes.optionId),
    db
      .select({ optionId: pollVotes.optionId })
      .from(pollVotes)
      .where(and(inArray(pollVotes.pollId, ids), eq(pollVotes.userId, viewerId))),
  ]);

  const countBy = new Map(counts.map((c) => [c.optionId, Number(c.votes)]));
  const mineSet = new Set(mine.map((m) => m.optionId));

  return pollRows.map((p) => {
    const opts = options
      .filter((o) => o.pollId === p.id)
      .map((o) => ({ id: o.id, label: o.label, votes: countBy.get(o.id) ?? 0, mine: mineSet.has(o.id) }));
    return {
      id: p.id,
      question: p.question,
      isOfficialCourt: p.isOfficialCourt,
      createdBy: p.createdById && p.createdBy?.id ? p.createdBy : null,
      createdAt: p.createdAt.toISOString(),
      options: opts,
      totalVotes: opts.reduce((sum, o) => sum + o.votes, 0),
    };
  });
}

/** Inserts the poll and its options atomically (neon-http batch = one transaction). */
export async function createPoll(input: {
  eventId: string;
  createdBy: string;
  question: string;
  options: string[];
  isOfficialCourt: boolean;
}): Promise<string> {
  const pollId = crypto.randomUUID();
  await db.batch([
    db.insert(polls).values({
      id: pollId,
      eventId: input.eventId,
      question: input.question,
      createdBy: input.createdBy,
      isOfficialCourt: input.isOfficialCourt,
    }),
    db.insert(pollOptions).values(input.options.map((label, position) => ({ pollId, label, position }))),
  ]);
  return pollId;
}

/** The poll exists in this event and the option belongs to it. */
export async function findPollOption(eventId: string, pollId: string, optionId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: pollOptions.id })
    .from(pollOptions)
    .innerJoin(polls, eq(polls.id, pollOptions.pollId))
    .where(and(eq(pollOptions.id, optionId), eq(pollOptions.pollId, pollId), eq(polls.eventId, eventId)))
    .limit(1);
  return Boolean(row);
}

/**
 * Casts or moves the viewer's single vote in one statement (upsert on the
 * unique (poll_id, user_id) index). Voting for the current option is a no-op,
 * matching legacy `votePoll`.
 */
export async function castVote(pollId: string, optionId: string, userId: string): Promise<void> {
  await db
    .insert(pollVotes)
    .values({ pollId, optionId, userId })
    .onConflictDoUpdate({ target: [pollVotes.pollId, pollVotes.userId], set: { optionId } });
}
