import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the current window resets (0 when ok). */
  retryAfter: number;
}

/** Presets: [max requests, window seconds]. */
export const LIMITS = {
  /** Chat messages per user. */
  message: [30, 60],
  /** Event creation per user. */
  createEvent: [10, 86400],
  /** Reports filed per user. */
  report: [20, 86400],
  /** Invite-code lookups per IP. */
  inviteLookup: [60, 3600],
  /** Single-shot AI endpoints per user. */
  aiAction: [30, 3600],
  /** Uploads per user. */
  upload: [20, 3600],
} as const satisfies Record<string, readonly [number, number]>;

/**
 * Fixed-window counter stored in Postgres (`rate_limits` table), so it works
 * across serverless instances without an extra service. One atomic upsert per call.
 * Fails open (allows the request) if the DB call itself errors.
 */
export async function rateLimit(
  key: string,
  [limit, windowSec]: readonly [number, number],
): Promise<RateLimitResult> {
  try {
    const res = await db.execute<{ count: number; reset_in: number }>(sql`
      INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, now(), 1)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec})
                     THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec})
                     THEN now() ELSE rate_limits.window_start END
      RETURNING count,
        GREATEST(0, CEIL(EXTRACT(EPOCH FROM (window_start + make_interval(secs => ${windowSec}) - now()))))::int AS reset_in
    `);
    const row = res.rows[0];
    const count = Number(row?.count ?? 0);
    return count > limit
      ? { ok: false, retryAfter: Number(row?.reset_in ?? windowSec) }
      : { ok: true, retryAfter: 0 };
  } catch (error) {
    console.error("[rate-limit] check failed, allowing request", error);
    return { ok: true, retryAfter: 0 };
  }
}

export function tooManyRequests(retryAfter: number): Response {
  return Response.json(
    { error: "Too many requests — please try again later." },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } },
  );
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/**
 * Single-holder lock on top of the same table: the first caller in the window
 * gets it; release() frees it early. Expires on its own after `ttlSec` if the
 * holder dies, so a crashed run can't block forever.
 */
export async function acquireLock(key: string, ttlSec: number): Promise<{ ok: boolean; release: () => Promise<void> }> {
  const { ok } = await rateLimit(`lock:${key}`, [1, ttlSec]);
  return {
    ok,
    release: async () => {
      if (!ok) return;
      await db.execute(sql`DELETE FROM rate_limits WHERE key = ${`lock:${key}`}`).catch((error) => {
        console.error("[rate-limit] lock release failed", error);
      });
    },
  };
}

/**
 * Deletes counters and locks whose window ended long ago. The longest window
 * in LIMITS is 1 day and lock TTLs are ≤ maxDuration, so 2 days is safely past all.
 */
export async function purgeExpiredRateLimits(): Promise<number> {
  const res = await db.execute<{ key: string }>(
    sql`DELETE FROM rate_limits WHERE window_start < now() - interval '2 days' RETURNING key`,
  );
  return res.rows.length;
}
