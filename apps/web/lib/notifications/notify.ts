import "server-only";

import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export type NotificationType = (typeof notifications.$inferInsert)["type"];

/**
 * In-app notifications for one or more users. Phase 3 adds Web Push / email
 * fan-out here, so every caller goes through this one function.
 */
export async function notify(
  userIds: string[],
  n: { type: NotificationType; title: string; body?: string; eventId?: string | null },
): Promise<void> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return;
  await db.insert(notifications).values(
    unique.map((userId) => ({ userId, type: n.type, title: n.title, body: n.body ?? "", eventId: n.eventId ?? null })),
  );
}
