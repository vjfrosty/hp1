# AGENTS.md — hp1 ("АЙДЕ ПО ЕДНА!")

Rules for AI agents and humans working in this repo. Background and reasoning: `RECOMMENDATIONS.md`.

## Stack (target)

- Turborepo, npm workspaces: `apps/web` (Next.js 16 App Router, Tailwind v4), `packages/shared` (types, zod schemas, `bulgaria.ts`).
- Hosted on Vercel. Database: Neon Postgres (Vercel Marketplace) with Drizzle ORM.
- Auth: Clerk (`@clerk/nextjs`), Bulgarian localisation.
- AI: OpenRouter with Google Gemini models (`google/gemini-*`), through `apps/web/lib/ai/` only.
- All UI text is Bulgarian.

## Always

1. **Auth fails closed.** Every route handler calls `requireUser()` itself. `proxy.ts` is not the authority for the API. If Clerk is not configured, protected handlers return 503. Never fall back to an anonymous user.
2. **Age check on the server.** Every action that joins, creates or posts checks `users.age_confirmed_at` and returns 403 without it.
3. **`exact_address` never leaves the server** unless the viewer is the organiser or a `confirmed` attendee. Every route that returns an event uses `toPublicEvent(event, viewer)`.
4. **Coordinates are district-level only.** Snap `approx_lat`/`approx_lng` to the neighbourhood centre from `bulgaria.ts` on the server, whatever the client sends.
5. **Blocks apply in both directions**, in the database queries, not in the UI.
6. **Private and friends-only events** stay out of the feed and radar for non-members. They are reachable only through a random `invite_code` (10+ URL-safe characters).
7. **Chronicle tags need consent.** A tagged person stays hidden until `chronicle_tags.consent_given_at` is set.
8. **Validate with zod** at every API boundary. Schemas live in `packages/shared`.
9. **Rate-limit every write route** with `lib/rate-limit.ts` (messages 30/min, events 10/day, reports 20/day, invite lookups 60/h per IP, AI actions per `LIMITS.aiAction`).
10. **AI calls go through `lib/ai/openrouter.ts`** so telemetry and the model fallback apply. Never send `exact_address`, emails or untagged/unconsented names to a model. A human makes every moderation decision; AI only scores.
11. **Service worker never caches** `/api/*`, `/sign-in`, `/sign-up`, `/__clerk`, or any user-specific response. Offline mode is read-only.

## Never

- Never accept a role or `is_admin` from a request body. Admin comes from Clerk `publicMetadata.role` or `ADMIN_USER_IDS`.
- Never run `drizzle-kit push`. Use `drizzle-kit generate` and commit every migration, then `drizzle-kit migrate`.
- Never import `lib/db/schema.ts` from client code.
- Never expose a server secret to the browser. Only `NEXT_PUBLIC_*` variables reach the client.
- Never add features that reward drinking volume. Keep the responsible-drinking framing.

## Commands

- `npm run lint` — type check (today: `tsc --noEmit`).
- `npm run build` — production build.
