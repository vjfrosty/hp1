import { createWisdomSchema } from "@hp1/shared";
import { and, eq, isNull } from "drizzle-orm";

import { badRequest, forbidden, parseBody, privateJson, uuidParam } from "@/lib/api/route";
import { requireAdultUser, requireUser } from "@/lib/auth/current-user";
import { isGroupMember } from "@/lib/community/groups";
import { limitWrite } from "@/lib/community/limits";
import { loadWisdom } from "@/lib/community/wisdom";
import { db } from "@/lib/db";
import { users, wisdom } from "@/lib/db/schema";
import { notify } from "@/lib/notifications/notify";
import { blockedUserIds } from "@/lib/social/blocks";

/**
 * GET /api/wisdom?groupId=uuid — "Мъдрост от масата", newest 50.
 * Visibility: the author; the quoted person; members of the group when it was
 * shared to that group. Never public. Blocks apply to author and quoted person.
 */
export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const groupId = new URL(req.url).searchParams.get("groupId") ?? undefined;
  if (groupId && !uuidParam(groupId)) return badRequest("groupId: invalid");
  return privateJson(await loadWisdom(auth.user.id, { groupId }));
}

/** POST /api/wisdom — a quote from the table. Quoting someone needs their consent. */
export async function POST(req: Request) {
  const auth = await requireAdultUser();
  if (!auth.ok) return auth.response;
  const me = auth.user;
  const limited = await limitWrite("wisdom", me.id);
  if (limited) return limited;

  const body = await parseBody(req, createWisdomSchema);
  if (!body.ok) return body.response;
  const w = body.data;

  if (w.groupId && !(await isGroupMember(w.groupId, me.id))) {
    return forbidden("Само членове на дружината споделят в нея.");
  }
  if (w.quotedUserId && w.quotedUserId !== me.id) {
    const blocked = await blockedUserIds(me.id);
    if (blocked.has(w.quotedUserId)) return badRequest("quotedUserId: cannot quote this user");
    const found = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, w.quotedUserId), isNull(users.deletedAt)))
      .limit(1);
    if (found.length === 0) return badRequest("quotedUserId: unknown user");
  }

  // Consent belongs to the quoted person, never the author: a quote about
  // someone else starts unconsented and they are asked (POST /api/wisdom/[id]/consent).
  const quotesSomeoneElse = Boolean(w.quotedUserId) && w.quotedUserId !== me.id;
  const [row] = await db
    .insert(wisdom)
    .values({
      authorId: me.id,
      quote: w.quote,
      context: w.context || "От последната маса",
      quotedUserId: w.quotedUserId ?? null,
      consentGiven: quotesSomeoneElse ? false : w.consentGiven,
      sharedToGroup: w.sharedToGroup,
      groupId: w.groupId ?? null,
    })
    .returning({ id: wisdom.id });

  if (quotesSomeoneElse && w.quotedUserId) {
    await notify([w.quotedUserId], {
      type: "invite",
      title: "Цитираха те в „Мъдрост от масата“",
      body: `${me.nickname || "Участник"} записа твоя мисъл: „${w.quote.slice(0, 80)}“. Одобри или я премахни.`,
    });
  }

  const [dto] = await loadWisdom(me.id, { id: row.id });
  return privateJson(dto ?? null, { status: 201 });
}
