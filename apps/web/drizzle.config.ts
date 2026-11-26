import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` needs no database. `drizzle-kit migrate` reads
// DATABASE_URL (from `vercel env pull .env.local` locally). Never use `push`.
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
