import { forbidden, notFound, privateJson, uuidParam } from "@/lib/api/route";
import { requireAdultUser } from "@/lib/auth/current-user";
import { loadGroup, toggleQuorumVote } from "@/lib/community/groups";
import { limitWrite } from "@/lib/community/limits";
import { notify } from "@/lib/notifications/notify";

/**
 * POST /api/groups/[id]/quorum-slots/[slotId]/vote — toggles the viewer's vote.
 * The vote that first reaches quorumRequired notifies every member (type 'quorum').
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string; slotId: string }> }) {
  const auth = await requireAdultUser();
  if (!auth.ok) return auth.response;
  const params = await ctx.params;
  const groupId = uuidParam(params.id);
  const slotId = uuidParam(params.slotId);
  if (!groupId || !slotId) return notFound();
  const limited = await limitWrite("quorumVote", auth.user.id);
  if (limited) return limited;

  const outcome = await toggleQuorumVote(groupId, slotId, auth.user.id);
  if (outcome.status === "not_found") return notFound();
  if (outcome.status === "not_member") return forbidden("Само членове на дружината гласуват.");
  if (outcome.notify) {
    const { userIds, title, body } = outcome.notify;
    await notify(userIds, { type: "quorum", title, body }).catch((error) => {
      console.error("[quorum] notify failed", error);
    });
  }
  return privateJson(await loadGroup(auth.user.id, groupId));
}
