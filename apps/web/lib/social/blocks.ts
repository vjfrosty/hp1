import "server-only";

import { eq, or, sql, type SQL, type AnyColumn } from "drizzle-orm";

import { db } from "@/lib/db";
import { blocks } from "@/lib/db/schema";

/**
 * Every user id the viewer must not interact with: people the viewer blocked
 * AND people who blocked the viewer (AGENTS.md rule 5, both directions).
 */
export async function blockedUserIds(viewerId: string): Promise<Set<string>> {
  const rows = await db
    .select({ blockerId: blocks.blockerId, blockedId: blocks.blockedId })
    .from(blocks)
    .where(or(eq(blocks.blockerId, viewerId), eq(blocks.blockedId, viewerId)));
  const ids = new Set<string>();
  for (const r of rows) ids.add(r.blockerId === viewerId ? r.blockedId : r.blockerId);
  return ids;
}

/**
 * SQL condition: `userColumn` is not blocked by, and has not blocked, the viewer.
 * Use inside WHERE clauses so filtering happens in the query, not the UI.
 */
export function notBlockedBy(viewerId: string, userColumn: AnyColumn): SQL {
  return sql`not exists (
    select 1 from ${blocks}
    where (${blocks.blockerId} = ${viewerId} and ${blocks.blockedId} = ${userColumn})
       or (${blocks.blockedId} = ${viewerId} and ${blocks.blockerId} = ${userColumn})
  )`;
}
