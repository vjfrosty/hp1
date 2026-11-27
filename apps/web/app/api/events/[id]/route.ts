import { eq } from "drizzle-orm";
import { districtPoint, updateEventSchema } from "@hp1/shared";

import { badRequest, conflict, forbidden, notFound, parseBody, privateJson, uuidParam } from "@/lib/api/route";
import { requireUser } from "@/lib/auth/current-user";
import { events } from "@/lib/db/schema";
import { withTransaction } from "@/lib/db/tx";
import { isInviteCodeShape } from "@/lib/events/invite";
import { limitInviteLookup } from "@/lib/events/invite-limit";
import { getEventAccess, serializeEvent } from "@/lib/events/load";
import { describeEventChange } from "@/lib/events/rules";
import { EVENT_WRITE_LIMITS, activeAttendeeIds, systemMessage } from "@/lib/events/service";
import { notify } from "@/lib/notifications/notify";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/events/[id]?invite=CODE — 404 for missing and for not-allowed alike. */
export async function GET(req: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const id = uuidParam((await ctx.params).id);
  if (!id) return notFound();

  const invite = new URL(req.url).searchParams.get("invite") ?? undefined;
  if (invite !== undefined) {
    // Invite lookups are rate-limited per IP and per user (AGENTS.md rule 9).
    const limited = await limitInviteLookup(req, auth.user.id);
    if (limited) return limited;
  }
  const inviteCode = invite && isInviteCodeShape(invite) ? invite : undefined;

  const access = await getEventAccess(id, auth.user.id, { inviteCode });
  if (!access) return notFound("Сбирката не е намерена");
  return privateJson(await serializeEvent(access.event, auth.user.id));
}

/**
 * PATCH /api/events/[id] — organiser changes venue, time or description.
 * Coordinates are re-snapped to the district centre; attendees are notified
 * and a system message goes to the chat.
 *
 * Uses requireUser, not requireAdultUser: only the organiser may call it, and
 * creating the event already required the age check.
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const id = uuidParam((await ctx.params).id);
  if (!id) return notFound();

  const access = await getEventAccess(id, auth.user.id);
  if (!access) return notFound("Сбирката не е намерена");
  if (!access.isOrganizer) return forbidden("Само организаторът може да променя сбирката");
  const before = access.event;
  if (before.cancelledAt) return conflict("Сбирката е отменена");

  const body = await parseBody(req, updateEventSchema);
  if (!body.ok) return body.response;
  const patch = body.data;

  const limit = await rateLimit(`event-edit:${auth.user.id}`, EVENT_WRITE_LIMITS.organiserAction);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const after = {
    venueName: patch.venueName ?? before.venueName,
    exactAddress: patch.exactAddress ?? before.exactAddress,
    city: patch.city ?? before.city,
    neighborhood: patch.neighborhood ?? before.neighborhood,
    startsAt: patch.startsAt ? new Date(patch.startsAt) : before.startsAt,
    description: patch.description ?? before.description,
  };
  const point = districtPoint(after.city, after.neighborhood);
  if (!point) return badRequest("Непознат град");

  const change = describeEventChange(before, after);
  if (!change) return privateJson(await serializeEvent(before, auth.user.id));

  const updated = await withTransaction(async (tx) => {
    const [row] = await tx
      .update(events)
      .set({ ...after, approxLat: point.lat, approxLng: point.lng, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    await systemMessage(tx, id, change.chatText, {
      isPinned: change.venueChanged,
      locationCard: change.locationCard,
    });
    return row;
  });

  await notify(await activeAttendeeIds(id, before.organizerId), {
    type: "change",
    title: change.title,
    body: change.body,
    eventId: id,
  });

  return privateJson(await serializeEvent(updated, auth.user.id));
}
