import "server-only";

import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * Community write limits, [max, window seconds] per user (AGENTS.md rule 9).
 * Kept here so lib/rate-limit.ts stays owned by the foundation.
 */
export const COMMUNITY_LIMITS = {
  profile: [30, 3600],
  createGroup: [5, 86400],
  membership: [30, 3600],
  quorumSlot: [20, 3600],
  quorumVote: [60, 3600],
  chronicle: [10, 86400],
  like: [120, 3600],
  tagConsent: [60, 3600],
  wisdom: [30, 86400],
  notificationsRead: [120, 3600],
} as const satisfies Record<string, readonly [number, number]>;

/** null when allowed, otherwise the 429 response to return. */
export async function limitWrite(action: keyof typeof COMMUNITY_LIMITS, userId: string): Promise<Response | null> {
  const r = await rateLimit(`community:${action}:${userId}`, COMMUNITY_LIMITS[action]);
  return r.ok ? null : tooManyRequests(r.retryAfter);
}
