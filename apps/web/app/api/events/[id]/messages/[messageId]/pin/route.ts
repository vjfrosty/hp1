import type { PinResponse } from "@hp1/shared";

import { forbidden, notFound, privateJson, uuidParam } from "@/lib/api/route";
import { guardEventSocial } from "@/lib/social/guard";
import { findMessage, togglePin } from "@/lib/social/messages";

type Ctx = { params: Promise<{ id: string; messageId: string }> };

/** POST /api/events/[id]/messages/[messageId]/pin: organiser only, toggles the pin. */
export async function POST(_req: Request, { params }: Ctx) {
  const { id, messageId: rawMessageId } = await params;
  const g = await guardEventSocial(id, { write: true, bucket: "pin" });
  if (!g.ok) return g.response;
  if (!g.access.isOrganizer) return forbidden("Само организаторът може да закрепя съобщения");

  const messageId = uuidParam(rawMessageId);
  const message = messageId ? await findMessage(g.eventId, messageId, g.user.id) : null;
  if (!message) return notFound();

  const isPinned = await togglePin(message.id);
  return privateJson({ messageId: message.id, isPinned } satisfies PinResponse);
}
