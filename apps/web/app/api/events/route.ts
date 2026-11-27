import { createEventSchema, districtPoint, eventsQuerySchema } from "@hp1/shared";

import { badRequest, forbidden, parseBody, privateJson } from "@/lib/api/route";
import { requireAdultUser, requireUser } from "@/lib/auth/current-user";
import { contributions, eventAttendees, events } from "@/lib/db/schema";
import { withTransaction } from "@/lib/db/tx";
import { newInviteCode } from "@/lib/events/invite";
import { serializeEvent } from "@/lib/events/load";
import { createdSystemText, defaultContributions, normalizeCreateEvent } from "@/lib/events/rules";
import { isGroupMember, listEvents, systemMessage } from "@/lib/events/service";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";

/** GET /api/events?city=&scope=feed|radar|mine */
export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const params = Object.fromEntries(new URL(req.url).searchParams);
  const query = eventsQuerySchema.safeParse({ city: params.city || undefined, scope: params.scope || undefined });
  if (!query.success) return badRequest("Невалидни филтри");

  return privateJson(await listEvents(auth.user.id, query.data));
}

/** POST /api/events — create a gathering. */
export async function POST(req: Request) {
  const auth = await requireAdultUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const body = await parseBody(req, createEventSchema);
  if (!body.ok) return body.response;
  const input = body.data;

  // Server-side district coordinates only; the client's are never read.
  const point = districtPoint(input.city, input.neighborhood);
  if (!point) return badRequest("Непознат град");

  if (input.groupId && !(await isGroupMember(input.groupId, user.id))) {
    return forbidden("Не членувате в тази група");
  }

  const limit = await rateLimit(`event:${user.id}`, LIMITS.createEvent);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const created = await withTransaction(async (tx) => {
    const [event] = await tx
      .insert(events)
      .values({ ...normalizeCreateEvent(input, point), organizerId: user.id, inviteCode: newInviteCode() })
      .returning();
    await tx.insert(eventAttendees).values({
      eventId: event.id,
      userId: user.id,
      status: "confirmed",
      isOrganizer: true,
      nonAlcoholic: user.nonAlcoholicPreferred,
    });
    await tx.insert(contributions).values(defaultContributions().map((c) => ({ ...c, eventId: event.id })));
    await systemMessage(tx, event.id, createdSystemText(user.nickname || "Организаторът"));
    return event;
  });

  return privateJson(await serializeEvent(created, user.id), { status: 201 });
}
