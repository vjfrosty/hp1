import { createPollSchema, type PollsResponse } from "@hp1/shared";

import { forbidden, parseBody, privateJson } from "@/lib/api/route";
import { guardEventSocial } from "@/lib/social/guard";
import { createPoll, listPolls } from "@/lib/social/polls";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/events/[id]/polls: newest first, counts + the viewer's own vote only. */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const g = await guardEventSocial(id, { write: false });
  if (!g.ok) return g.response;
  const polls = await listPolls(g.eventId, g.user.id);
  return privateJson({ polls } satisfies PollsResponse);
}

/** POST /api/events/[id]/polls {question, options[2..6], isOfficialCourt?} */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const g = await guardEventSocial(id, { write: true, bucket: "poll" });
  if (!g.ok) return g.response;

  const body = await parseBody(req, createPollSchema);
  if (!body.ok) return body.response;
  if (body.data.isOfficialCourt && !g.access.isOrganizer) {
    return forbidden("Само организаторът внася дела в „Съдът на мезето“");
  }

  const pollId = await createPoll({
    eventId: g.eventId,
    createdBy: g.user.id,
    question: body.data.question,
    options: body.data.options,
    isOfficialCourt: body.data.isOfficialCourt ?? false,
  });
  const [poll] = await listPolls(g.eventId, g.user.id, pollId);
  return privateJson(poll, { status: 201 });
}
