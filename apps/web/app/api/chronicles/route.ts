import { createChronicleSchema } from "@hp1/shared";
import { and, inArray, isNull } from "drizzle-orm";

import { badRequest, forbidden, parseBody, privateJson, uuidParam } from "@/lib/api/route";
import { requireAdultUser, requireUser } from "@/lib/auth/current-user";
import { attendedEvent, loadChronicle, loadChronicles } from "@/lib/community/chronicles";
import { isGroupMember } from "@/lib/community/groups";
import { limitWrite } from "@/lib/community/limits";
import { db } from "@/lib/db";
import { chronicles, chronicleTags, users } from "@/lib/db/schema";
import { withTransaction } from "@/lib/db/tx";
import { notify } from "@/lib/notifications/notify";
import { blockedUserIds } from "@/lib/social/blocks";

/**
 * GET /api/chronicles?before=ISO&groupId=uuid — newest first, 30 per page.
 * Only chronicles the viewer may see (public; group → member; friends →
 * author, tagged or attended the event), minus hidden ones and blocked authors.
 */
export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const params = new URL(req.url).searchParams;
  const beforeRaw = params.get("before");
  const before = beforeRaw ? new Date(beforeRaw) : undefined;
  if (before && Number.isNaN(before.getTime())) return badRequest("before: invalid date");
  const groupId = params.get("groupId") ?? undefined;
  if (groupId && !uuidParam(groupId)) return badRequest("groupId: invalid");
  return privateJson(await loadChronicles(auth.user.id, { before, groupId }));
}

/** POST /api/chronicles — a new "Летопис" entry. Tagged people are asked for consent. */
export async function POST(req: Request) {
  const auth = await requireAdultUser();
  if (!auth.ok) return auth.response;
  const me = auth.user;
  const limited = await limitWrite("chronicle", me.id);
  if (limited) return limited;

  const body = await parseBody(req, createChronicleSchema);
  if (!body.ok) return body.response;
  const c = body.data;

  if (c.groupId && !(await isGroupMember(c.groupId, me.id))) {
    return forbidden("Само членове на дружината пишат в нейния летопис.");
  }
  if (c.eventId && !(await attendedEvent(c.eventId, me.id))) {
    return forbidden("Само участници в сбирката пишат летопис за нея.");
  }

  const tagIds = c.taggedUserIds.filter((id) => id !== me.id);
  if (tagIds.length > 0) {
    const blocked = await blockedUserIds(me.id);
    if (tagIds.some((id) => blocked.has(id))) return badRequest("taggedUserIds: cannot tag this user");
    const found = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, tagIds), isNull(users.deletedAt)));
    if (found.length !== tagIds.length) return badRequest("taggedUserIds: unknown user");
  }

  const title = c.title || "Вечерна сбирка";
  const id = await withTransaction(async (tx) => {
    const [row] = await tx
      .insert(chronicles)
      .values({
        title,
        eventId: c.eventId ?? null,
        groupId: c.groupId ?? null,
        authorId: me.id,
        city: c.city,
        officialDecision: c.officialDecision,
        story: c.story,
        photoUrl: c.photoUrl ?? null,
        visibility: c.visibility,
        consentConfirmed: c.consentConfirmed,
      })
      .returning({ id: chronicles.id });
    if (tagIds.length > 0) {
      // consent_given_at stays NULL: hidden until each person approves (AGENTS.md rule 7).
      await tx.insert(chronicleTags).values(tagIds.map((userId) => ({ chronicleId: row.id, userId })));
    }
    return row.id;
  });

  if (tagIds.length > 0) {
    await notify(tagIds, {
      type: "invite",
      title: "Отбелязан си в летописа",
      body: `${me.nickname || "Приятел"} те отбеляза в „${title}“. Потвърди, ако си съгласен да се показваш в записа, или махни отбелязването.`,
      eventId: c.eventId ?? null,
    }).catch((error) => console.error("[chronicle] notify failed", error));
  }

  return privateJson(await loadChronicle(me.id, id), { status: 201 });
}
