import { sofiaTime } from "@hp1/shared";

/**
 * True only on the vote that lifts a slot from below the quorum to the quorum.
 * Removing a vote never triggers it, nor does a vote on an already-reached slot.
 */
export function quorumReachedNow(votesBefore: number, votesAfter: number, required: number): boolean {
  return votesAfter > votesBefore && votesBefore < required && votesAfter >= required;
}

/** Notification texts, ported from the legacy `voteQuorumSlot`. */
export function quorumNotification(groupName: string, slotLabel: string, startsAt: Date | string) {
  return {
    title: "Кворумът е събран!",
    body: `Общият удобен час за ${groupName}: ${slotLabel} (${sofiaTime(startsAt)}) вече има достатъчно гласове.`,
  };
}
