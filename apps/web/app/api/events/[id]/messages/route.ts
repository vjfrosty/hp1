import { messagesQuerySchema, sendMessageSchema, type MessagesResponse } from "@hp1/shared";

import { badRequest, parseBody, privateJson } from "@/lib/api/route";
import { guardEventSocial } from "@/lib/social/guard";
import { createMessage, listMessages } from "@/lib/social/messages";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/events/[id]/messages?after=<ISO>: latest 200 (or newer than `after`), oldest first. */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const g = await guardEventSocial(id, { write: false });
  if (!g.ok) return g.response;

  const q = messagesQuerySchema.safeParse({ after: new URL(req.url).searchParams.get("after") ?? undefined });
  if (!q.success) return badRequest("after: невалидна дата");

  const messages = await listMessages(g.eventId, g.user.id, q.data.after ? new Date(q.data.after) : undefined);
  return privateJson({ messages } satisfies MessagesResponse);
}

/** POST /api/events/[id]/messages {text?, sticker?, locationCard?} */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const g = await guardEventSocial(id, { write: true, bucket: "msg" });
  if (!g.ok) return g.response;

  const body = await parseBody(req, sendMessageSchema);
  if (!body.ok) return body.response;

  const { event } = g.access;
  const u = g.user;
  const message = await createMessage({
    eventId: g.eventId,
    sender: {
      id: u.id,
      nickname: u.nickname,
      avatarInitials: u.avatarInitials,
      avatarColor: u.avatarColor,
      avatarUrl: u.avatarUrl,
      roleId: u.roleId,
    },
    text: body.data.text ?? "",
    sticker: body.data.sticker ?? null,
    // Built from the event row; the client only asks for it.
    locationCard: body.data.locationCard
      ? { venueName: event.venueName, neighborhood: event.neighborhood, city: event.city }
      : null,
  });
  return privateJson(message, { status: 201 });
}
