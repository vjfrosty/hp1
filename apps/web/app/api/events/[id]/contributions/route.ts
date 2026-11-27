import { addContributionSchema, type ContributionsResponse } from "@hp1/shared";

import { parseBody, privateJson } from "@/lib/api/route";
import { addContribution, listContributions } from "@/lib/social/contributions";
import { guardEventSocial } from "@/lib/social/guard";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/events/[id]/contributions: the meze list. */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const g = await guardEventSocial(id, { write: false });
  if (!g.ok) return g.response;
  const contributions = await listContributions(g.eventId);
  return privateJson({ contributions } satisfies ContributionsResponse);
}

/** POST /api/events/[id]/contributions {item, category}: adds a free item. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const g = await guardEventSocial(id, { write: true, bucket: "contrib" });
  if (!g.ok) return g.response;

  const body = await parseBody(req, addContributionSchema);
  if (!body.ok) return body.response;

  const contribution = await addContribution(g.eventId, body.data.item, body.data.category);
  return privateJson(contribution, { status: 201 });
}
