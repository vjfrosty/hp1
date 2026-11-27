import { toggleReactionSchema, type ReactionsResponse } from "@hp1/shared";

import { notFound, parseBody, privateJson, uuidParam } from "@/lib/api/route";
import { guardEventSocial } from "@/lib/social/guard";
import { findMessage, loadReactions, toggleReaction } from "@/lib/social/messages";

type Ctx = { params: Promise<{ id: string; messageId: string }> };

/** POST /api/events/[id]/messages/[messageId]/reactions {emoji}: toggles the viewer's reaction. */
export async function POST(req: Request, { params }: Ctx) {
  const { id, messageId: rawMessageId } = await params;
  const g = await guardEventSocial(id, { write: true, bucket: "react" });
  if (!g.ok) return g.response;

  const messageId = uuidParam(rawMessageId);
  const message = messageId ? await findMessage(g.eventId, messageId, g.user.id) : null;
  if (!message) return notFound();

  const body = await parseBody(req, toggleReactionSchema);
  if (!body.ok) return body.response;

  await toggleReaction(message.id, g.user.id, body.data.emoji);
  const reactions = (await loadReactions([message.id], g.user.id)).get(message.id) ?? [];
  return privateJson({ messageId: message.id, reactions } satisfies ReactionsResponse);
}
