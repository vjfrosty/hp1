import { purgeExpiredRateLimits } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Daily job (vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "Cron not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const purged = await purgeExpiredRateLimits();
  return Response.json({ purged });
}
