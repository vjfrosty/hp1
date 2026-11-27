import "server-only";

import { conflict, forbidden, notFound, uuidParam } from "@/lib/api/route";
import { requireAdultUser, requireUser } from "@/lib/auth/current-user";
import type { UserRow } from "@/lib/db/users";
import { getEventAccess, type EventAccess } from "@/lib/events/load";
import { rateLimit, tooManyRequests, LIMITS } from "@/lib/rate-limit";

export type SocialGuard =
  | { ok: true; user: UserRow; access: EventAccess; eventId: string }
  | { ok: false; response: Response };

/**
 * Shared gate for every /api/events/[id]/{messages,polls,contributions} route:
 * 1. auth (adult for writes), 2. valid uuid, 3. event visible (else 404),
 * 4. organiser or confirmed attendee (else 403), 5. writes on a cancelled
 * event answer 409, 6. writes are rate-limited per user and bucket.
 */
export async function guardEventSocial(
  rawEventId: string,
  opts: { write: false } | { write: true; bucket: string; limit?: readonly [number, number] },
): Promise<SocialGuard> {
  const auth = opts.write ? await requireAdultUser() : await requireUser();
  if (!auth.ok) return auth;

  const eventId = uuidParam(rawEventId);
  if (!eventId) return { ok: false, response: notFound() };

  const access = await getEventAccess(eventId, auth.user.id);
  if (!access) return { ok: false, response: notFound() };
  if (!access.privateOk) return { ok: false, response: forbidden("Чатът е само за потвърдени участници") };

  if (opts.write) {
    if (access.event.cancelledAt) return { ok: false, response: conflict("Сбирката е отменена") };
    const rl = await rateLimit(`${opts.bucket}:${auth.user.id}`, opts.limit ?? LIMITS.message);
    if (!rl.ok) return { ok: false, response: tooManyRequests(rl.retryAfter) };
  }

  return { ok: true, user: auth.user, access, eventId };
}

