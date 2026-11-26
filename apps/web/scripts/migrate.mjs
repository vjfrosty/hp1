// Applies committed Drizzle migrations (./drizzle) before `next build` on Vercel.
// Each Vercel environment has its own Neon branch, so production and every
// preview get the schema that matches their code. Skips when no database is
// configured (CI, local builds without .env.local).
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] no DATABASE_URL, skipping");
  process.exit(0);
}

await migrate(drizzle(neon(url)), { migrationsFolder: "./drizzle" });
console.log("[migrate] migrations applied");
