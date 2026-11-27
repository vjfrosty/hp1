import { updateContributionSchema } from "@hp1/shared";

import { conflict, forbidden, notFound, parseBody, privateJson, uuidParam } from "@/lib/api/route";
import { getContribution, getContributionState, moveContribution } from "@/lib/social/contributions";
import { guardEventSocial } from "@/lib/social/guard";
import { nextContributionState } from "@/lib/social/logic";

type Ctx = { params: Promise<{ id: string; contributionId: string }> };

/**
 * PATCH /api/events/[id]/contributions/[contributionId]
 * {action: 'cycle'} free -> claimed by me -> done -> free, or
 * {action: 'set', status} for "Освободи" / "Върни в процес".
 * Only the assignee or the organiser can move a claimed or done item.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id, contributionId: rawId } = await params;
  const g = await guardEventSocial(id, { write: true, bucket: "contrib" });
  if (!g.ok) return g.response;

  const contributionId = uuidParam(rawId);
  if (!contributionId) return notFound();

  const body = await parseBody(req, updateContributionSchema);
  if (!body.ok) return body.response;

  const current = await getContributionState(g.eventId, contributionId);
  if (!current) return notFound();

  const target = body.data.action === "set" ? body.data.status : undefined;
  const move = nextContributionState(current, g.user.id, g.access.isOrganizer, target);
  if (!move.ok) {
    return move.reason === "forbidden"
      ? forbidden("Тази задача е поета от друг участник")
      : conflict("Задачата вече е в това състояние");
  }

  if (!(await moveContribution(contributionId, current, move.next))) {
    return conflict("Някой току-що промени задачата. Опреснете списъка.");
  }
  const updated = await getContribution(g.eventId, contributionId);
  return updated ? privateJson(updated) : notFound();
}
