import "server-only";

import { LIMITS, clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * Rate-limits invite-code lookups per IP and per user (AGENTS.md rule 9), so
 * codes cannot be brute-forced through any route that accepts one. Call it
 * before getEventAccess() whenever a code is supplied. Returns a 429 response
 * or null.
 */
export async function limitInviteLookup(req: Request, userId: string): Promise<Response | null> {
  for (const key of [`invite:${clientIp(req)}`, `invite-user:${userId}`]) {
    const limit = await rateLimit(key, LIMITS.inviteLookup);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);
  }
  return null;
}
