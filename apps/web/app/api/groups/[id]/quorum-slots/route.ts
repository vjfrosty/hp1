import { createQuorumSlotSchema } from "@hp1/shared";

import { badRequest, forbidden, notFound, parseBody, privateJson, uuidParam } from "@/lib/api/route";
import { requireAdultUser } from "@/lib/auth/current-user";
import { groupExists, isGroupMember, loadGroup } from "@/lib/community/groups";
import { limitWrite } from "@/lib/community/limits";
import { db } from "@/lib/db";
import { quorumSlots } from "@/lib/db/schema";

const MAX_AHEAD_MS = 180 * 24 * 3600 * 1000;

/** POST /api/groups/[id]/quorum-slots — a member proposes a time `{label, startsAt}`. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdultUser();
  if (!auth.ok) return auth.response;
  const id = uuidParam((await ctx.params).id);
  if (!id || !(await groupExists(id))) return notFound();
  if (!(await isGroupMember(id, auth.user.id))) return forbidden("Само членове на дружината предлагат час.");
  const limited = await limitWrite("quorumSlot", auth.user.id);
  if (limited) return limited;

  const body = await parseBody(req, createQuorumSlotSchema);
  if (!body.ok) return body.response;
  const startsAt = new Date(body.data.startsAt);
  const now = Date.now();
  if (startsAt.getTime() <= now) return badRequest("startsAt: must be in the future");
  if (startsAt.getTime() > now + MAX_AHEAD_MS) return badRequest("startsAt: at most 180 days ahead");

  await db.insert(quorumSlots).values({ groupId: id, label: body.data.label, startsAt });
  return privateJson(await loadGroup(auth.user.id, id), { status: 201 });
}
