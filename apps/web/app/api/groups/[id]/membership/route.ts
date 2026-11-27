import { and, eq } from "drizzle-orm";

import { forbidden, notFound, privateJson, uuidParam } from "@/lib/api/route";
import { requireUser } from "@/lib/auth/current-user";
import { groupExists, loadGroup } from "@/lib/community/groups";
import { limitWrite } from "@/lib/community/limits";
import { db } from "@/lib/db";
import { groupMembers } from "@/lib/db/schema";

/**
 * POST /api/groups/[id]/membership — toggles join/leave, returns the GroupDTO.
 * Leaving needs only a session; joining also needs the 18+ confirmation.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const id = uuidParam((await ctx.params).id);
  if (!id || !(await groupExists(id))) return notFound();
  const limited = await limitWrite("membership", auth.user.id);
  if (limited) return limited;

  const left = await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, auth.user.id)))
    .returning({ userId: groupMembers.userId });
  if (left.length === 0) {
    if (!auth.user.ageConfirmedAt) return forbidden("Age confirmation required");
    await db.insert(groupMembers).values({ groupId: id, userId: auth.user.id }).onConflictDoNothing();
  }
  return privateJson(await loadGroup(auth.user.id, id));
}
