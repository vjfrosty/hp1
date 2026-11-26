import { sql } from "drizzle-orm";

import { isServerAuthConfigured } from "@/lib/auth/current-user";
import { db, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Deploy health. Reports configuration only, never values. Production answers
 * 503 when auth or the database is missing, so a broken env blocks rollout.
 */
export async function GET() {
  const auth = isServerAuthConfigured();
  const webhook = Boolean(process.env.CLERK_WEBHOOK_SIGNING_SECRET);
  const ai = Boolean(process.env.OPENROUTER_API_KEY);
  let database = false;
  if (isDatabaseConfigured()) {
    database = await db
      .execute(sql`select 1`)
      .then(() => true)
      .catch(() => false);
  }
  const ok = auth && database;
  return Response.json(
    { ok, auth, webhook, database, ai },
    { status: ok || process.env.VERCEL_ENV !== "production" ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
