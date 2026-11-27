// Pure social-domain rules. No database, no "server-only", so tests import it directly.
import type { MezeStatus, ReactionDTO } from "@hp1/shared";

// ─── reactions ───────────────────────────────────────────────────────────────

export interface ReactionRow {
  messageId: string;
  userId: string;
  emoji: string;
}

/**
 * Groups raw reaction rows per message into `{emoji, count, mine}` lists.
 * Emojis keep the order in which they first appear in `order` (allow-list), then
 * any unknown ones alphabetically. Never returns who reacted.
 */
export function aggregateReactions(
  rows: readonly ReactionRow[],
  viewerId: string,
  order: readonly string[] = [],
): Map<string, ReactionDTO[]> {
  const perMessage = new Map<string, Map<string, ReactionDTO>>();
  for (const r of rows) {
    let byEmoji = perMessage.get(r.messageId);
    if (!byEmoji) perMessage.set(r.messageId, (byEmoji = new Map()));
    const entry = byEmoji.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
    entry.count += 1;
    if (r.userId === viewerId) entry.mine = true;
    byEmoji.set(r.emoji, entry);
  }
  const rank = (e: string) => {
    const i = order.indexOf(e);
    return i === -1 ? order.length : i;
  };
  const out = new Map<string, ReactionDTO[]>();
  for (const [messageId, byEmoji] of perMessage) {
    out.set(
      messageId,
      [...byEmoji.values()].sort((a, b) => rank(a.emoji) - rank(b.emoji) || a.emoji.localeCompare(b.emoji)),
    );
  }
  return out;
}

/** Applies a reaction toggle to a client-side list (optimistic update). */
export function toggleReactionList(list: readonly ReactionDTO[], emoji: string): ReactionDTO[] {
  const existing = list.find((r) => r.emoji === emoji);
  if (!existing) return [...list, { emoji, count: 1, mine: true }];
  if (!existing.mine) return list.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r));
  return existing.count <= 1
    ? list.filter((r) => r.emoji !== emoji)
    : list.map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1, mine: false } : r));
}

// ─── polls ───────────────────────────────────────────────────────────────────

/**
 * Legacy `votePoll` semantics: one vote per user per poll. Voting for another
 * option moves the vote; voting for the option already chosen keeps it (no-op).
 */
export type VoteDecision = "insert" | "change" | "noop";

export function voteDecision(currentOptionId: string | null, optionId: string): VoteDecision {
  if (currentOptionId === null) return "insert";
  return currentOptionId === optionId ? "noop" : "change";
}

export interface PollOptionCount {
  id: string;
  label: string;
  votes: number;
  mine: boolean;
}

/** Applies a vote to option counts (server response building and optimistic update). */
export function applyVote<T extends PollOptionCount>(options: readonly T[], optionId: string): T[] {
  const current = options.find((o) => o.mine)?.id ?? null;
  const decision = voteDecision(current, optionId);
  if (decision === "noop" || !options.some((o) => o.id === optionId)) return [...options];
  return options.map((o) => {
    if (o.id === optionId) return { ...o, votes: o.votes + 1, mine: true };
    if (o.id === current) return { ...o, votes: Math.max(0, o.votes - 1), mine: false };
    return o;
  });
}

// ─── contributions ───────────────────────────────────────────────────────────

export interface ContributionState {
  status: MezeStatus;
  assigneeId: string | null;
}

export type ContributionMove =
  | { ok: true; next: ContributionState }
  | { ok: false; reason: "forbidden" | "noop" };

/**
 * Port of legacy `cycleContribution` plus the permission rule the legacy app
 * only enforced in the UI:
 *
 * - free item: anyone may claim it (it becomes theirs).
 * - claimed/done item: only the assignee or the organiser may move it. An item
 *   whose assignee deleted their account (assigneeId null) is open to anyone.
 * - target "free" clears the assignee. Moving between claimed and done keeps the
 *   current assignee, so an organiser marking an item done does not steal it.
 *
 * `target` undefined means "cycle": free -> claimed -> done -> free.
 */
export function nextContributionState(
  current: ContributionState,
  viewerId: string,
  isOrganizer: boolean,
  target?: MezeStatus,
): ContributionMove {
  const to: MezeStatus =
    target ?? (current.status === "free" ? "claimed" : current.status === "claimed" ? "done" : "free");
  if (to === current.status) return { ok: false, reason: "noop" };

  const owned = current.status !== "free" && current.assigneeId !== null;
  if (owned && current.assigneeId !== viewerId && !isOrganizer) return { ok: false, reason: "forbidden" };

  if (to === "free") return { ok: true, next: { status: "free", assigneeId: null } };
  return { ok: true, next: { status: to, assigneeId: owned ? current.assigneeId : viewerId } };
}
