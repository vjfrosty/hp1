import { decideAttendeeSchema } from "@hp1/shared";

import { conflict, forbidden, notFound, parseBody, privateJson, uuidParam } from "@/lib/api/route";
import { requireUser } from "@/lib/auth/current-user";
import { getEventAccess, serializeEvent } from "@/lib/events/load";
import { decisionTexts } from "@/lib/events/rules";
import { EVENT_WRITE_LIMITS, nicknameOf, storeDecision } from "@/lib/events/service";
import { notify } from "@/lib/notifications/notify";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string; userId: string }> };

/** POST /api/events/[id]/attendees/[userId] { action: approve | reject } — organiser only. */
export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const params = await ctx.params;
  const id = uuidParam(params.id);
  const targetId = uuidParam(params.userId);
  if (!id || !targetId) return notFound();

  const access = await getEventAccess(id, auth.user.id);
  if (!access) return notFound("Сбирката не е намерена");
  if (!access.isOrganizer) return forbidden("Само организаторът одобрява заявки");
  if (access.event.cancelledAt) return conflict("Сбирката е отменена");

  const body = await parseBody(req, decideAttendeeSchema);
  if (!body.ok) return body.response;
  const { action } = body.data;

  const limit = await rateLimit(`event-edit:${auth.user.id}`, EVENT_WRITE_LIMITS.organiserAction);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const nickname = await nicknameOf(targetId);
  if (nickname === null) return notFound("Няма такава заявка");
  const texts = decisionTexts(nickname, action);

  const result = await storeDecision({ eventId: id, userId: targetId, action, systemText: texts.chat });
  if (!result.ok) {
    if (result.reason === "full") return conflict("Няма свободни места");
    if (result.reason === "not_pending") return conflict("Заявката вече е обработена");
    if (result.reason === "cancelled") return conflict("Сбирката е отменена");
    return notFound("Няма такава заявка");
  }

  await notify([targetId], { type: "approval", title: texts.title, body: texts.body, eventId: id });

  return privateJson(await serializeEvent(access.event, auth.user.id));
}
