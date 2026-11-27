import { eq } from "drizzle-orm";

import { forbidden, notFound, privateJson, uuidParam } from "@/lib/api/route";
import { requireUser } from "@/lib/auth/current-user";
import { events } from "@/lib/db/schema";
import { withTransaction } from "@/lib/db/tx";
import { getEventAccess, serializeEvent } from "@/lib/events/load";
import { CANCEL_TEXT } from "@/lib/events/rules";
import { EVENT_WRITE_LIMITS, activeAttendeeIds, systemMessage } from "@/lib/events/service";
import { notify } from "@/lib/notifications/notify";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/events/[id]/cancel — organiser only. Idempotent. */
export async function POST(_req: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const id = uuidParam((await ctx.params).id);
  if (!id) return notFound();

  const access = await getEventAccess(id, auth.user.id);
  if (!access) return notFound("Сбирката не е намерена");
  if (!access.isOrganizer) return forbidden("Само организаторът може да отмени сбирката");
  if (access.event.cancelledAt) return privateJson(await serializeEvent(access.event, auth.user.id));

  const limit = await rateLimit(`event-edit:${auth.user.id}`, EVENT_WRITE_LIMITS.organiserAction);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const updated = await withTransaction(async (tx) => {
    const [row] = await tx
      .update(events)
      .set({ cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    await systemMessage(tx, id, CANCEL_TEXT);
    return row;
  });

  await notify(await activeAttendeeIds(id, access.event.organizerId), {
    type: "cancel",
    title: "Отменена сбирка",
    body: `„${access.event.title}“ — ${CANCEL_TEXT}`,
    eventId: id,
  });

  return privateJson(await serializeEvent(updated, auth.user.id));
}
