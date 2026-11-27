import { markNotificationsReadSchema } from "@hp1/shared";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { privateJson } from "@/lib/api/route";
import { requireUser } from "@/lib/auth/current-user";
import { limitWrite } from "@/lib/community/limits";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

/** POST /api/notifications/read `{ids?}` — marks the given (or, with no ids, all) as read. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;
  const limited = await limitWrite("notificationsRead", userId);
  if (limited) return limited;

  // An empty body means "all"; a present body must match the schema.
  const text = await req.text();
  let raw: unknown = {};
  if (text.trim() !== "") {
    try {
      raw = JSON.parse(text);
    } catch {
      return privateJson({ error: "Invalid body" }, { status: 400 });
    }
  }
  const parsed = markNotificationsReadSchema.safeParse(raw ?? {});
  if (!parsed.success) return privateJson({ error: "Invalid body" }, { status: 400 });
  const ids = parsed.data.ids;

  const mine = and(eq(notifications.userId, userId), isNull(notifications.readAt));
  if (ids === undefined || ids.length > 0) {
    await db
      .update(notifications)
      .set({ readAt: sql`now()` })
      .where(ids ? and(mine, inArray(notifications.id, ids)) : mine);
  }

  const [unread] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return privateJson({ unreadCount: Number(unread?.n ?? 0) });
}
