import { rsvpSchema } from "@hp1/shared";

import { badRequest, conflict, notFound, parseBody, privateJson, uuidParam } from "@/lib/api/route";
import { requireAdultUser } from "@/lib/auth/current-user";
import { canRsvp } from "@/lib/events/access";
import { isInviteCodeShape } from "@/lib/events/invite";
import { getEventAccess, serializeEvent } from "@/lib/events/load";
import { nextRsvpStatus, rsvpSystemText, shouldNotifyOrganizer } from "@/lib/events/rules";
import { EVENT_WRITE_LIMITS, storeRsvp } from "@/lib/events/service";
import { notify } from "@/lib/notifications/notify";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

const PAST_GRACE_MS = 6 * 3600 * 1000;

/**
 * POST /api/events/[id]/rsvp — confirmed | maybe | declined.
 * With manual approval a new "confirmed" is stored as pending_approval and the
 * organiser is notified. "declined" is stored (not deleted) with the excuse.
 */
export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireAdultUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;
  const id = uuidParam((await ctx.params).id);
  if (!id) return notFound();

  const body = await parseBody(req, rsvpSchema);
  if (!body.ok) return body.response;
  const input = body.data;

  const inviteCode = input.inviteCode && isInviteCodeShape(input.inviteCode) ? input.inviteCode : undefined;
  const access = await getEventAccess(id, user.id, { inviteCode });
  if (!access) return notFound("Сбирката не е намерена");
  const { event } = access;
  if (access.isOrganizer) return badRequest("Организаторът винаги присъства");
  if (event.cancelledAt) return conflict("Сбирката е отменена");
  if (!canRsvp(access.ctx, false)) return notFound("Сбирката не е намерена");
  if (event.startsAt.getTime() < Date.now() - PAST_GRACE_MS) return conflict("Сбирката вече е минала");

  const limit = await rateLimit(`rsvp:${user.id}`, EVENT_WRITE_LIMITS.rsvp);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const current = access.ctx.myStatus;
  const next = nextRsvpStatus(event.manualApproval, current, input.status);
  const nickname = user.nickname || "Участник";
  const result = await storeRsvp({
    eventId: id,
    userId: user.id,
    current,
    next,
    nonAlcoholic: input.nonAlcoholic ?? user.nonAlcoholicPreferred,
    lateMinutes: next === "confirmed" ? (input.lateMinutes ?? null) : null,
    excuse: next === "declined" ? (input.excuse || null) : null,
    systemText: rsvpSystemText(nickname, next, { lateMinutes: input.lateMinutes, excuse: input.excuse }),
  });
  if (!result.ok) {
    if (result.reason === "full") return conflict("Няма свободни места");
    if (result.reason === "cancelled") return conflict("Сбирката е отменена");
    return notFound("Сбирката не е намерена");
  }

  if (shouldNotifyOrganizer(current, next)) {
    await notify([event.organizerId], {
      type: "approval",
      title: "Нова заявка за място",
      body: `${nickname} иска да се присъедини към „${event.title}“.`,
      eventId: id,
    });
  }

  return privateJson(await serializeEvent(event, user.id));
}
