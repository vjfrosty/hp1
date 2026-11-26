import "server-only";

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "./schema";

// neon-http has no interactive transactions. The capacity check on RSVP and
// the GDPR delete need them, so they run over the WebSocket Pool instead.
neonConfig.webSocketConstructor = ws;

export type TxDatabase = NeonDatabase<typeof schema>;
type Tx = Parameters<Parameters<TxDatabase["transaction"]>[0]>[0];

/**
 * Runs `fn` in one Postgres transaction. Opens a short-lived pool per call,
 * which is the pattern Neon recommends for serverless functions.
 */
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  const pool = new Pool({ connectionString: url });
  try {
    const txDb = drizzle(pool, { schema });
    return await txDb.transaction(fn);
  } finally {
    await pool.end();
  }
}
