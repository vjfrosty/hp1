import "server-only";

import { auth } from "@clerk/nextjs/server";

import { isClerkConfigured } from "@/lib/auth/config";
import { getOrCreateUser, type UserRow } from "@/lib/db/users";

export type AuthResult =
  | { ok: true; user: UserRow }
  | { ok: false; response: Response };

/** True when the server has everything Clerk needs to verify a session. */
export function isServerAuthConfigured(): boolean {
  return isClerkConfigured && Boolean(process.env.CLERK_SECRET_KEY);
}

/**
 * The signed-in user's local `users` row, or the response to send instead.
 *
 * Fails closed: with Clerk unconfigured this is 503, never an anonymous user
 * (AGENTS.md rule 1). Every protected route handler calls this itself; the
 * proxy is not the authority for the API.
 */
export async function requireUser(): Promise<AuthResult> {
  if (!isServerAuthConfigured()) {
    return { ok: false, response: Response.json({ error: "Auth not configured" }, { status: 503 }) };
  }
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await getOrCreateUser(userId);
  return { ok: true, user };
}

/**
 * `requireUser()` plus the server-side 18+ check (AGENTS.md rule 2). Use it on
 * every route that joins, creates or posts.
 */
export async function requireAdultUser(): Promise<AuthResult> {
  const result = await requireUser();
  if (!result.ok) return result;
  if (!result.user.ageConfirmedAt) {
    return {
      ok: false,
      response: Response.json({ error: "Age confirmation required" }, { status: 403 }),
    };
  }
  return result;
}
