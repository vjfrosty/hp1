# hp1 ("АЙДЕ ПО ЕДНА!"): moving to a production stack

_Written 2026-11-26. Sources: the code in this repo, RouteCrafted (`vjfrosty/RouteCrafted`, tech stack) and DentAnnotate (`vjfrosty/DentAnnotate`, sign-in)._

This file has three parts:

1. What hp1 is today, and what is missing before real users can use it.
2. The target: RouteCrafted's stack with DentAnnotate's Clerk sign-in.
3. A phased plan, a database schema draft, and a checklist.

---

## 1. Current state of hp1

### 1.1 What exists

hp1 was generated in Google AI Studio. It is a client-only **Vite 8 + React 19 + Tailwind v4 PWA**, with all UI text in Bulgarian.

| Area | Implementation | Files |
|---|---|---|
| Build | Vite 8, `@vitejs/plugin-react`, `@tailwindcss/vite`, `vite-plugin-pwa` (autoUpdate, Workbox, Google Fonts caching) | `vite.config.ts` |
| App shell | One `App.tsx`. Tab switching uses `useState<ActiveTab>`, not a router. Invite links use `?invite=<eventId>`. | `src/App.tsx`, `src/components/AppShell.tsx` |
| State | One hook, `useAppStore` (1,046 lines, 28 actions). State lives in `localStorage` and syncs across tabs with `BroadcastChannel`. | `src/store/useAppStore.ts` |
| Data | Hard-coded seed data plus Bulgarian cities and neighbourhoods with coordinates | `src/data/seedData.ts`, `src/data/bulgaria.ts` |
| Features | Feed; radar map (Leaflet + OSM tiles); event creation; event detail with RSVP, approval, chat, reactions, pins, polls and meze contributions; groups with quorum voting; chronicle; "table wisdom"; profile; report and block; GDPR export and delete; 18+ age gate; offline indicator; install button | `src/components/*.tsx` |
| Types | A complete domain model: `UserProfile`, `GatheringEvent`, `Attendee`, `ChatMessage`, `MezePoll`, `MezeContribution`, `GroupCouncil`, `QuorumSlot`, `ChronicleEntry`, `TableWisdom`, `AppNotification`, `ModerationReport` | `src/types/app.ts` |

The UI and the domain model are the valuable parts. Keep both.

### 1.2 What is missing or wrong

| # | Problem | Why it matters |
|---|---|---|
| G1 | **No backend.** Every event, message and RSVP lives only in one browser's `localStorage`. | Two users can never see each other. The app is a single-player demo. |
| G2 | **No identity.** The "current user" is `INITIAL_USER_PROFILE` from seed data. | Organiser, approval and block rules mean nothing without a verified user. |
| G3 | **Privacy is enforced only in the UI.** `exactAddress` sits on every `GatheringEvent`, and `EventDetailView` only hides it (`canAccessPrivateContent`). | With a real API, the address reaches every client unless the server removes it. A home address of a private gathering is the most sensitive field in the app. |
| G4 | **The age gate is a `localStorage` flag** (`aide_po_edna_age_confirmed_v1`). | Clearing storage bypasses it. No record exists that a user confirmed 18+. |
| G5 | **GDPR export and delete affect only local data.** | Once a server exists, export must cover server data, and delete must remove the account at the auth provider too. |
| G6 | **Moderation (`reportTarget`, `blockUser`) is local only.** | Reports never reach anyone. Blocks do not stop a blocked user from seeing or joining your events. |
| G7 | **Unused dependencies:** `@google/genai`, `express`, `dotenv`. `metadata.json` declares `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`, but `src/` makes no Gemini call. | Dead weight, plus a misleading `.env.example` (`GEMINI_API_KEY`, `APP_URL`). |
| G8 | **AI Studio leftovers:** `package.json` name `react-example`, the `DISABLE_HMR` block, and the `copy-unbundled-src-assets` plugin, which copies `src/assets` into `dist/`. | Harmless, but not production code. Images belong in `public/` or object storage. |
| G9 | **OSM tiles are loaded directly** from `tile.openstreetmap.org`. | The OSM tile usage policy does not allow heavy production traffic. A real launch needs a tile provider. |
| G10 | **TypeScript `^7.0.2`.** RouteCrafted and DentAnnotate both use `^5`. | Align with the stack that Next.js and ESLint are tested against. Move to 7 only after checking Next.js support. |
| G11 | **One god hook, and props passed through `App.tsx`.** | Hard to replace with server calls one feature at a time. |

---

## 2. Target architecture

### 2.1 Stack, taken from RouteCrafted

| Layer | RouteCrafted uses | Recommendation for hp1 |
|---|---|---|
| Repo layout | Turborepo, npm workspaces: `apps/web`, `apps/mobile`, `packages/shared` | Same. Start with `apps/web` and `packages/shared`. Add `apps/mobile` (Expo) only if the PWA turns out not to be enough. |
| Web + API | Next.js 16 App Router; route handlers under `app/api/*`; `proxy.ts` | Same. The Next.js route handlers are the backend. Do not add Express. |
| Database | Neon Postgres via `@neondatabase/serverless` + `drizzle-orm/neon-http`, with a lazy `db` proxy (`apps/web/lib/db/index.ts`) | Same, including the lazy client, so `next build` and CI run without `DATABASE_URL`. One addition: `neon-http` has no interactive transactions, and this plan needs them for the attendee capacity check (2.4) and the GDPR delete (2.3). Run those through `drizzle-orm/neon-serverless` (WebSocket `Pool` from the same `@neondatabase/serverless` package), and keep `neon-http` for everything else. |
| Migrations | `drizzle-kit generate` then `drizzle-kit migrate`, every file committed, never `push` | Same rule, from the first table. |
| Validation | `zod` v4 at every API boundary (`lib/validation.ts`) | Same. Put the schemas in `packages/shared` so the client forms use them too. |
| Rate limiting | Postgres fixed-window counter in the `rate_limits` table (`lib/rate-limit.ts`), with a daily cleanup cron | Copy it as is. Limits needed: event creation, chat messages, reports, invite-link lookups. |
| AI | OpenRouter through one module (`lib/ai/openrouter.ts`): model read from DB settings, fallback model, `ai_telemetry` table | Copy it if AI features are added (see 2.6). Delete the unused Gemini SDK. |
| File uploads | Cloudflare R2 via `/api/upload/*` (`lib/storage/r2.ts`); keys stay on the server | Use it for chronicle photos, avatars and event covers. |
| Email | Resend (`lib/email/resend.ts`) | Use it for invite, approval and cancellation emails. Clerk sends its own sign-in emails. |
| Push | Expo push (`lib/notifications/expo-push.ts`) | Use **Web Push** (VAPID) for the PWA instead, with a `push_subscriptions` table. Add Expo push only together with a mobile app. |
| Styling | Tailwind v3 | Keep hp1's **Tailwind v4**. It is newer, and DentAnnotate already runs v4 with Next.js 16 through `@tailwindcss/postcss`. |
| Client data | Server components plus `fetch` | Add **TanStack Query** for the interactive screens (chat, RSVP, polls), as DentAnnotate does. Optimistic updates keep the current "instant" feel. |
| Testing | `tsx --test` unit tests, Playwright e2e, Snyk | Same. Add a Clerk e2e test with `@clerk/testing`, as DentAnnotate does. |
| CI | `.github/workflows/ci.yml`: typecheck, lint, unit tests, build, no secrets | Copy it unchanged. |
| Hosting | Vercel; cron in `vercel.json` | Vercel. For new scheduled jobs, use Vercel Schedules (`schedules`) instead of legacy `crons`. |
| Agent docs | `AGENTS.md` + `CODING_PLAN.md` | Write both for hp1 early. They keep AI agents inside the rules in section 2.5. |

### 2.2 PWA under Next.js

`vite-plugin-pwa` does not run under Next.js. Replace it with:

- **Manifest:** `app/manifest.ts`, a built-in Next.js file convention. Move the current manifest object from `vite.config.ts` into it unchanged: name, colours, `lang: 'bg'`, icons.
- **Service worker:** Serwist (`@serwist/next`), the maintained successor of `next-pwa`. Check that it supports the Next.js version you install before you adopt it.
- **Caching rules.** These matter once sign-in and private data exist:
  - Precache static assets and fonts. This is what Workbox does today.
  - **Never cache** `/api/*`, Clerk routes (`/sign-in`, `/sign-up`, `/__clerk`), or any response that contains another user's data. A cached private event must not be served to the next person on a shared phone.
  - Offline mode is read-only. Show the existing `OfflineIndicator`, and block writes rather than queue them. Queued RSVPs and chat messages create conflicts that are not worth solving in v1.
- Keep `usePWAInstall.ts` and `PWAInstallButton.tsx` as they are.

### 2.3 Sign-in: DentAnnotate's Clerk pattern

DentAnnotate uses **Clerk** (`@clerk/nextjs` v7) on Next.js 16. RouteCrafted uses Auth.js Credentials with bcrypt plus a separate hand-written mobile JWT. For hp1, take Clerk: no password storage, ready-made Google and email-code sign-in, a hosted user profile, and the same SDK family for a future Expo app.

#### Files to port from DentAnnotate (`frontend/`)

| DentAnnotate file | What it does | Change for hp1 |
|---|---|---|
| `lib/auth/config.ts` | One source of truth: `CLERK_PUBLISHABLE_KEY`, `isClerkConfigured`, `SIGN_IN_URL`, `SIGN_UP_URL`. Reads `process.env.NEXT_PUBLIC_…` by direct member access, so Next.js inlines it at build time. | Copy as is. |
| `components/auth/auth-provider.tsx` | Server component. Wraps the app body in `<ClerkProvider>` only when a key exists. | Copy. Pass `localization={bgBG}` from `@clerk/localizations` so the Clerk widgets show Bulgarian. |
| `proxy.ts` | Runs `clerkMiddleware()`, imported lazily. Calls `auth.protect()` on everything outside a public list, with explicit `signInUrl`/`signUpUrl` so users are not sent to Clerk's hosted portal. The matcher skips static assets. | Copy the structure. Set hp1's public list (see below). |
| `app/sign-in/[[...sign-in]]/page.tsx`, `app/sign-up/[[...sign-up]]/page.tsx` | Optional catch-all routes that Clerk needs for multi-step flows. Return 404 when Clerk is not configured. | Copy. Style them in hp1's tavern theme (`#1C4532`, `#F7F3EC`) through Clerk's `appearance` prop. |
| `components/auth/user-menu.tsx` | `<Show when="signed-in">` with `<UserButton/>`, and a `<SignInButton mode="modal">` fallback. Note: `<SignedIn>` was removed in Clerk Core 3 and now throws. | Copy into `AppShell`'s header. |
| `lib/auth/token.ts`, `components/auth/clerk-token-bridge.tsx` | Gives plain (non-hook) API functions a `getToken()` for `Authorization: Bearer`. | **Not needed for the web app.** hp1's API is same-origin Next.js, so Clerk's session cookie travels with every request. Port these two files only when an Expo app or another separate client appears. |
| `lib/api/client.ts` → `SessionExpiredError` | Turns a 401 into "your session expired, sign in again" instead of a generic error. A 403 is deliberately not treated that way. | Copy the error class and the 401/403 split into hp1's fetch helper. A chat message that fails mid-conversation should show a sign-in prompt. |

#### Server side: what changes from DentAnnotate

DentAnnotate's backend is FastAPI. It verifies Clerk tokens itself against JWKS (`backend/app/auth/deps.py`, `jwks.py`): RS256 only, `iss`/`exp`/`aud` checks, a cached JWKS with rotation handling, and 503 instead of 401 when Clerk is unreachable. In hp1 the backend is Next.js, so the Clerk SDK does all of that:

```ts
// apps/web/lib/auth/current-user.ts
import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { getOrCreateUser } from '@/lib/db/users'

export async function requireUser() {
  const { userId } = await auth()
  if (!userId) return null           // caller answers 401
  return getOrCreateUser(userId)      // local users row, keyed by Clerk `sub`
}
```

```ts
// apps/web/app/api/events/[id]/rsvp/route.ts
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  if (!user.ageConfirmedAt) return new Response('Age confirmation required', { status: 403 })
  const { id } = await params
  // zod-validate body, check blocks, check capacity, write...
}
```

For a future Expo client, verify `Authorization: Bearer` with `verifyToken` from `@clerk/backend`. That replaces RouteCrafted's hand-written `mobile-jwt.ts` and `verify-bearer.ts`.

#### Do not copy DentAnnotate's anonymous mode into the API

DentAnnotate runs in two modes. With no Clerk keys, every request becomes `ANONYMOUS` and nothing is rejected (its decision D-004). That made sense for a single-clinic tool with no keys yet. For a social app it is a security hole: a missing env var in production would make every write anonymous and every private event open.

- **Keep** `isClerkConfigured` for the UI and the build, so `next build` and CI run without keys.
- **Make the API fail closed.** If Clerk is not configured, protected route handlers return 503 ("auth not configured"). They never fall back to an anonymous user.
- Treat a missing Clerk key as a deploy-blocking error in production: check it at startup, or let a health endpoint report it.

#### Public and protected paths

| Public (signed out) | Protected |
|---|---|
| `/` landing, `/sign-in/*`, `/sign-up/*`, `/__clerk/*` | `/feed`, `/radar`, `/events/new`, `/groups`, `/chronicle`, `/profile` |
| `/i/[code]` invite landing: event title, city, date and organiser nickname only | `/events/[id]` full detail |
| `/manifest.webmanifest`, icons, service worker | every `/api/*` route except webhooks and the health check |
| `/api/webhooks/clerk` (verified by signature instead) | |

Follow DentAnnotate's rule here. `proxy.ts` decides which pages redirect to sign-in. **Every route handler still checks `auth()` itself**, because the proxy is not the authority for the API.

#### Linking Clerk users to the database

- Add a local `users` table keyed by `clerk_user_id` (the token's `sub`, such as `user_2ab…`). All foreign keys point at the local `users.id`, never at Clerk directly.
- Create the row two ways. Lazily on first request (`getOrCreateUser`), so the app never depends on webhook timing. And through a **Clerk webhook** (`/api/webhooks/clerk`, verified with `verifyWebhook` from `@clerk/nextjs/webhooks`) for `user.updated` and `user.deleted`.
- **Admin role:** set `publicMetadata.role = 'admin'` in the Clerk dashboard, and read it from session claims on the server. Or use an `ADMIN_USER_IDS` env list, as DentAnnotate does. Never accept a role from the request body. RouteCrafted's AGENTS.md has the same rule.
- **Sign-in methods:** Google and email code to start. Phone (SMS) works well in Bulgaria, but Clerk bills SMS separately, so add it only if users ask for it.

#### Age gate (fixes G4)

- Keep `AgeGateModal` for the UI. On confirm, `POST /api/me/age-confirmation` writes `users.age_confirmed_at = now()`.
- Every action that joins, creates or posts checks `age_confirmed_at` on the server and returns 403 without it.
- Store the confirmation timestamp only, not a birth date. A timestamp is enough evidence and is less personal data under GDPR.

#### GDPR (fixes G5)

- `GET /api/me/export` returns every row the user owns or appears in: profile, RSVPs, messages, polls, chronicles, wisdom, reports filed. Keep the existing download button and file name.
- `DELETE /api/me` runs in one transaction. It deletes or anonymises the user's rows: chat messages become "изтрит участник" so threads stay readable. Then it calls `clerkClient.users.deleteUser(clerkUserId)`. The `user.deleted` webhook also triggers the same cleanup, so deleting in the Clerk dashboard is covered too.

### 2.4 Database schema draft (Drizzle)

This is derived from `src/types/app.ts`. Arrays that are embedded in one object today (attendees, messages, polls, votes, reactions) become their own tables, because several users write them at the same time.

| Table | Key columns | Notes |
|---|---|---|
| `users` | `id uuid`, `clerk_user_id text unique`, `nickname`, `avatar_initials`, `avatar_color`, `avatar_url`, `city`, `neighborhood`, `usual_availability`, `company_size`, `role_id` (humorous role), `non_alcoholic_preferred`, `radar_active`, `radar_radius_km`, `radar_message`, `age_confirmed_at`, `is_admin`, `created_at`, `deleted_at` | `preferred_venues`, `favorite_meze`, `interests`, `earned_badges` can be `text[]`. |
| `events` | `id`, `organizer_id → users`, `group_id → groups null`, `title`, `description`, `starts_at timestamptz`, `city`, `neighborhood`, `venue_name`, **`exact_address`**, `venue_type`, **`approx_lat`, `approx_lng`**, `max_attendees`, `is_private`, `manual_approval`, `friends_only`, `planned_food`, `non_alcoholic_friendly`, `seasonal_theme`, `cover_image_url`, `invite_code unique`, `cancelled_at` | Store `starts_at` only. Compute `dateLabel` and `timeBucket` ("днес", "вечер") on the client in `Europe/Sofia` time. Coordinates are district-level only (see 2.5). |
| `event_attendees` | `event_id`, `user_id`, `status` (`confirmed`/`maybe`/`declined`/`pending_approval`), `is_organizer`, `non_alcoholic`, `late_minutes`, `excuse`, `joined_at` | PK `(event_id, user_id)`. Enforce the capacity check inside the same transaction as the insert. |
| `event_messages` | `id`, `event_id`, `sender_id null`, `text`, `is_system`, `is_pinned`, `sticker`, `location_card jsonb`, `created_at` | `sender_id` is set to NULL when the sender deletes their account. |
| `message_reactions` | `message_id`, `user_id`, `emoji` | PK of all three columns. This replaces `Record<emoji, userId[]>`. |
| `polls`, `poll_options`, `poll_votes` | `polls(id, event_id, question, created_by, is_official_court)`; `poll_votes(option_id, user_id)` | One vote per user per poll: a unique index on `(poll_id, user_id)` with `poll_id` copied into `poll_votes`. |
| `contributions` | `id`, `event_id`, `item`, `category`, `status` (`free`/`claimed`/`done`), `assigned_to_user_id null` | |
| `groups`, `group_members` | `groups(id, name, motto, city, regular_schedule, quorum_required, meetings_held, created_by)` | Compute `memberCount` and `memberNames` from `group_members`. Do not store them. |
| `quorum_slots`, `quorum_votes` | `quorum_slots(id, group_id, label, starts_at)`; `quorum_votes(slot_id, user_id)` | |
| `chronicles`, `chronicle_tags`, `chronicle_likes` | `chronicles(id, event_id null, group_id null, author_id, official_decision, story, photo_url, visibility, consent_confirmed, created_at)` | `chronicle_tags(chronicle_id, user_id, consent_given_at null)`: a tagged person should approve the tag before it shows publicly. |
| `wisdom` | `id`, `author_id`, `quote`, `quoted_user_id null`, `context`, `consent_given`, `shared_to_group`, `group_id null` | |
| `notifications` | `id`, `user_id`, `type`, `title`, `body`, `event_id null`, `read_at null`, `created_at` | |
| `reports` | `id`, `reporter_id`, `target_type` (`event`/`user`/`message`/`chronicle`), `target_id`, `reason`, `status` (`open`/`actioned`/`dismissed`), `handled_by null`, `created_at` | Add `message` and `chronicle` targets. Chat is where most abuse happens. |
| `blocks` | `blocker_id`, `blocked_id`, `created_at` | PK of both. This replaces `profile.blockedUserIds`. |
| `push_subscriptions` | `id`, `user_id`, `endpoint unique`, `p256dh`, `auth`, `created_at` | For Web Push. |
| `rate_limits` | copy from RouteCrafted | |

Put the shared TypeScript types in `packages/shared/src/` and derive the API response types from them, as RouteCrafted does. The client must never import `lib/db/schema.ts`.

### 2.5 Privacy and safety rules (enforce on the server)

These rules fix G3 and G6. They belong in hp1's future `AGENTS.md` under "Always".

1. **`exact_address` never leaves the server** unless the viewer is the organiser or has `status = 'confirmed'` in `event_attendees`. Use one serialiser (`toPublicEvent(event, viewer)`) for every route that returns an event, so no route can forget. Unit-test it.
2. **Coordinates are district-level only.** Snap `approx_lat`/`approx_lng` to the neighbourhood centre from `src/data/bulgaria.ts` on the server, whatever the client sends. Keep the current comment, "never exact home GPS", as an enforced rule rather than a convention.
3. **Blocks apply in both directions.** If A blocked B, B does not see A's events in the feed or on the radar, cannot RSVP to them, and A does not see B's messages. Apply the filter in the queries, not in the UI.
4. **Private and friends-only events** do not appear in the feed or radar for non-members. They are reachable only through `invite_code`.
5. **Invite codes are random**, at least 10 characters from a URL-safe alphabet. Do not use `?invite=evt_1`, which anyone can guess and iterate. Rate-limit lookups per IP.
6. **Chronicle photos and tags need consent.** Keep `consentConfirmed`, and also keep tagged people hidden until each one approves (`chronicle_tags.consent_given_at`).
7. **Responsible-drinking framing.** The age gate copy ("Организираме компания, а не състезание по пиене") and the designated-driver role are good. Keep them. Do not add features that reward drinking volume.
8. **Admin moderation queue.** Add an `/admin/reports` page that lists open reports and lets an admin hide an event, message or chronicle, or suspend a user. Without it, the report button does nothing useful.
9. **Rate limits:** messages (for example 30 per minute per user), event creation (10 per day), reports (20 per day), invite lookups (60 per hour per IP).

### 2.6 Real-time chat

The chat is currently instant because it is local. Over a network, in order of effort:

1. **MVP: polling.** TanStack Query `refetchInterval` of 3–5 s, only while the event chat is open. Send with an optimistic update. No new service is needed.
2. **Later: SSE or WebSockets.** Vercel Functions now support WebSockets, and SSE works on the default Node.js runtime. Either one removes the polling delay. Neon's HTTP driver cannot `LISTEN/NOTIFY`, so you would also need a pub/sub source: a hosted realtime service such as Ably or Pusher, or Neon's WebSocket driver. Decide only if polling proves too slow or too costly.

### 2.7 AI features (optional)

hp1 makes no AI calls today. If you want AI, copy RouteCrafted's `lib/ai/openrouter.ts`, `ai-config.ts` and `telemetry.ts` unchanged and route every call through them. Features that fit the product:

- **Event description writer:** from venue type, food and theme, write a warm Bulgarian invite.
- **Chronicle writer:** turn the "official decision" and a few notes into a short, humorous chronicle story.
- **Moderation assist:** score reported messages or chronicles and pre-sort the admin queue. A human still decides.

Rate-limit each feature as RouteCrafted does (`LIMITS.aiAction`).

---

## 3. Migration plan

Each phase ends deployable. Do not delete the Vite app until phase 2 reaches feature parity.

### Phase 0: clean up (half a day)

- Remove `@google/genai`, `express`, `@types/express` and `dotenv`, the `DISABLE_HMR` block and `metadata.json`, and rename the package.
- Replace `.env.example` with the real variables (see section 4).
- Move `src/assets/images/*` to `public/images/` and delete the `copy-unbundled-src-assets` plugin.
- Pin TypeScript to `^5`.
- Add `AGENTS.md` with the rules from 2.3 and 2.5.

### Phase 1: monorepo and sign-in (1–2 days)

- Scaffold a Turborepo with `apps/web` (Next.js 16, Tailwind v4) and `packages/shared`. Copy `turbo.json` and `ci.yml` from RouteCrafted.
- Port Clerk from DentAnnotate: `config.ts`, `auth-provider.tsx`, `proxy.ts`, sign-in and sign-up pages, `user-menu.tsx`.
- Add `lib/auth/current-user.ts` (`requireUser`), with the fail-closed API rule.
- Add Neon, the Drizzle config, the lazy `db`, and migration `0000` with `users` and `rate_limits`.
- Add the Clerk webhook (`user.updated`, `user.deleted`) and the age confirmation endpoint.
- Add `app/manifest.ts` and the service worker with the caching rules from 2.2.
- **Done when:** a new user signs in with Google, confirms 18+, and has a `users` row; signed-out visitors are redirected; the PWA installs.

### Phase 2: port the UI and replace local state (3–5 days)

- Move the `src/components/*` views into `apps/web` as client components, one route per tab: `/feed`, `/radar`, `/events/new`, `/events/[id]`, `/groups`, `/chronicle`, `/profile`. `AppShell` becomes `app/(app)/layout.tsx`.
- Split `useAppStore` into TanStack Query hooks per domain (`useEvents`, `useEvent(id)`, `useRsvp`, `useChat(eventId)`, `useGroups`, …), each backed by a zod-validated route handler.
- Migrate in this order: events and RSVP, approval, chat, polls and contributions, groups and quorum, chronicle and wisdom, notifications.
- Build `toPublicEvent()` with unit tests before the first event endpoint ships.
- Keep `seedData.ts` as a dev-only seed script (`scripts/seed-mock-data.ts`, as in RouteCrafted).
- **Done when:** two browsers signed in as different users can create, join, approve and chat on one event, and the non-approved user never receives `exact_address` (check it in the network tab and in a test).

### Phase 3: safety, GDPR, notifications (2–3 days)

- Add blocks, reports and the admin moderation queue.
- Add the GDPR export and delete endpoints, wired to Clerk deletion.
- Add rate limits on every write route.
- Add invite codes and the public `/i/[code]` landing page.
- Add Web Push for invites, approvals, venue changes and cancellations, plus Resend email as a fallback.
- Add R2 uploads for chronicle photos and avatars.

### Phase 4: launch readiness

- Switch the map to a tile provider that allows production use (Mapbox, which RouteCrafted already uses, MapTiler, or Stadia). Keep Leaflet.
- Create a separate production Clerk instance with live keys. DentAnnotate's `DEVELOPMENT_CLERK.md` warns against mixing environments.
- Add Playwright e2e tests: a Clerk sign-in smoke test with `@clerk/testing`, and the two-user event flow.
- Write a privacy policy and terms in Bulgarian, linked from the age gate and sign-up.
- Run a Snyk scan, using RouteCrafted's workflow.

---

## 4. Environment variables

```bash
# Database (Neon)
DATABASE_URL=

# Clerk (DentAnnotate pattern)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
ADMIN_USER_IDS=                 # optional, comma-separated Clerk user ids

# Storage (Cloudflare R2, server only)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Email (Resend)
RESEND_API_KEY=

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# Map tiles
NEXT_PUBLIC_MAP_TILE_URL=
NEXT_PUBLIC_MAP_TILE_KEY=

# AI (only if section 2.7 features are built)
OPENROUTER_API_KEY=
```

Only variables prefixed `NEXT_PUBLIC_` may reach the browser. `CLERK_SECRET_KEY`, `R2_*`, `VAPID_PRIVATE_KEY` and `OPENROUTER_API_KEY` stay on the server.

---

## 5. Checklist

- [ ] Phase 0 cleanup done; unused deps removed
- [ ] Turborepo + Next.js 16 + Tailwind v4 + `packages/shared`
- [ ] CI copied from RouteCrafted and passing without secrets
- [ ] Clerk ported from DentAnnotate; Bulgarian localisation; themed sign-in
- [ ] API fails closed when Clerk is not configured (no anonymous fallback)
- [ ] `users` keyed by `clerk_user_id`; lazy upsert + webhook
- [ ] Age confirmation stored server-side and checked on every join, create and post
- [ ] Drizzle migrations committed from `0000`; never `drizzle-kit push`
- [ ] `toPublicEvent()` strips `exact_address`; unit-tested
- [ ] Coordinates snapped to district on the server
- [ ] Blocks applied in queries, both directions
- [ ] Random invite codes; rate-limited lookup
- [ ] Reports reach an admin queue
- [ ] GDPR export and delete cover the server and Clerk
- [ ] Service worker never caches `/api/*` or Clerk routes
- [ ] Production tile provider
- [ ] Separate production Clerk instance
- [ ] Playwright: Clerk smoke test + two-user event flow
