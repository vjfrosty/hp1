import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "./index";
import { users } from "./schema";

export type UserRow = typeof users.$inferSelect;

/**
 * The local row for a Clerk user, created on first sight. Lazy creation means
 * the app never depends on webhook timing; the webhook only syncs updates and
 * deletes. One upsert, safe under concurrent first requests.
 */
export async function getOrCreateUser(clerkUserId: string): Promise<UserRow> {
  const existing = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  if (existing[0]) return existing[0];

  const inserted = await db
    .insert(users)
    .values({ clerkUserId })
    .onConflictDoUpdate({ target: users.clerkUserId, set: { updatedAt: sql`now()` } })
    .returning();
  return inserted[0];
}

export async function confirmAge(userId: string): Promise<UserRow> {
  const updated = await db
    .update(users)
    .set({ ageConfirmedAt: sql`coalesce(${users.ageConfirmedAt}, now())`, updatedAt: sql`now()` })
    .where(eq(users.id, userId))
    .returning();
  return updated[0];
}

/** Profile fields Clerk owns. Called from the `user.created`/`user.updated` webhook. */
export async function syncFromClerk(
  clerkUserId: string,
  profile: { nickname: string; avatarUrl: string | null },
): Promise<void> {
  const initials = profile.nickname
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  await db
    .insert(users)
    .values({ clerkUserId, nickname: profile.nickname, avatarUrl: profile.avatarUrl, avatarInitials: initials })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
        avatarInitials: initials,
        updatedAt: sql`now()`,
      },
    });
}

/**
 * Removes the local user after a Clerk `user.deleted` event. Phase 3 replaces
 * this with the full GDPR cleanup (anonymise messages, delete owned rows) in
 * one transaction.
 */
export async function deleteByClerkId(clerkUserId: string): Promise<void> {
  await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
}
