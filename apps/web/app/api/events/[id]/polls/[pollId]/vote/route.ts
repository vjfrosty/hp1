import { votePollSchema } from "@hp1/shared";

import { notFound, parseBody, privateJson, uuidParam } from "@/lib/api/route";
import { guardEventSocial } from "@/lib/social/guard";
import { castVote, findPollOption, listPolls } from "@/lib/social/polls";

type Ctx = { params: Promise<{ id: string; pollId: string }> };

/**
 * POST /api/events/[id]/polls/[pollId]/vote {optionId}
 * One vote per user per poll; another option moves it, the same option keeps it
 * (legacy `votePoll`). Returns the updated PollDTO.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id, pollId: rawPollId } = await params;
  const g = await guardEventSocial(id, { write: true, bucket: "vote" });
  if (!g.ok) return g.response;

  const pollId = uuidParam(rawPollId);
  if (!pollId) return notFound();

  const body = await parseBody(req, votePollSchema);
  if (!body.ok) return body.response;
  if (!(await findPollOption(g.eventId, pollId, body.data.optionId))) return notFound();

  await castVote(pollId, body.data.optionId, g.user.id);
  const [poll] = await listPolls(g.eventId, g.user.id, pollId);
  return poll ? privateJson(poll) : notFound();
}
