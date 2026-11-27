import { wisdomConsentSchema, type WisdomConsentResult } from "@hp1/shared";
import { and, eq } from "drizzle-orm";

import { notFound, parseBody, privateJson, uuidParam } from "@/lib/api/route";
import { requireUser } from "@/lib/auth/current-user";
import { limitWrite } from "@/lib/community/limits";
import { db } from "@/lib/db";
import { wisdom } from "@/lib/db/schema";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/wisdom/[id]/consent `{accept}` — only the quoted person may answer.
 * Accept: the quote may be shown to the group. Decline: the quote is deleted.
 * Anyone else gets 404, so the endpoint does not reveal the quote exists.
 */
export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const id = uuidParam((await ctx.params).id);
  if (!id) return notFound();
  const limited = await limitWrite("wisdom", auth.user.id);
  if (limited) return limited;

  const body = await parseBody(req, wisdomConsentSchema);
  if (!body.ok) return body.response;

  const mine = and(eq(wisdom.id, id), eq(wisdom.quotedUserId, auth.user.id));
  const rows = body.data.accept
    ? await db.update(wisdom).set({ consentGiven: true }).where(mine).returning({ id: wisdom.id })
    : await db.delete(wisdom).where(mine).returning({ id: wisdom.id });
  if (rows.length === 0) return notFound();

  const result: WisdomConsentResult = { status: body.data.accept ? "accepted" : "removed" };
  return privateJson(result);
}
