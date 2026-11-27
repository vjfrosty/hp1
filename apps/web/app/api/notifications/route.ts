import type { NotificationDTO, NotificationsResponse, NotificationTypeId } from "@hp1/shared";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { privateJson } from "@/lib/api/route";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

/** GET /api/notifications — latest 50 plus the total unread count. */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  const [rows, [unread]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
  ]);

  const items: NotificationDTO[] = rows.map((n) => ({
    id: n.id,
    type: n.type as NotificationTypeId,
    title: n.title,
    body: n.body,
    eventId: n.eventId,
    read: n.readAt !== null,
    createdAt: n.createdAt.toISOString(),
  }));
  return privateJson({ items, unreadCount: Number(unread?.n ?? 0) } satisfies NotificationsResponse);
}
