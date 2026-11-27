import { tagConsentSchema, type TagConsentResult } from "@hp1/shared";
import { and, eq, sql } from "drizzle-orm";

import { forbidden, notFound, parseBody, privateJson, uuidParam } from "@/lib/api/route";
import { requireUser } from "@/lib/auth/current-user";
import { limitWrite } from "@/lib/community/limits";
import { db } from "@/lib/db";
import { chronicleTags } from "@/lib/db/schema";

/**
 * POST /api/chronicles/[id]/tag-consent `{accept}` — the tagged person approves
 * the tag (sets consent_given_at, they become visible) or removes it.
 * Removing your own tag needs only a session; accepting needs the 18+ check.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const id = uuidParam((await ctx.params).id);
  if (!id) return notFound();
  const limited = await limitWrite("tagConsent", auth.user.id);
  if (limited) return limited;

  const body = await parseBody(req, tagConsentSchema);
  if (!body.ok) return body.response;
  const mine = and(eq(chronicleTags.chronicleId, id), eq(chronicleTags.userId, auth.user.id));

  if (!body.data.accept) {
    const removed = await db.delete(chronicleTags).where(mine).returning({ userId: chronicleTags.userId });
    if (removed.length === 0) return notFound();
    return privateJson({ status: "removed" } satisfies TagConsentResult);
  }

  if (!auth.user.ageConfirmedAt) return forbidden("Age confirmation required");
  const updated = await db
    .update(chronicleTags)
    .set({ consentGivenAt: sql`coalesce(${chronicleTags.consentGivenAt}, now())` })
    .where(mine)
    .returning({ userId: chronicleTags.userId });
  if (updated.length === 0) return notFound();
  return privateJson({ status: "accepted" } satisfies TagConsentResult);
}
