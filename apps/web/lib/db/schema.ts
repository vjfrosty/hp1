import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ─── users ────────────────────────────────────────────────────────────────────
// One row per Clerk user. Every foreign key points at users.id, never at Clerk.

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    nickname: text("nickname").notNull().default(""),
    avatarInitials: text("avatar_initials").notNull().default(""),
    avatarColor: text("avatar_color").notNull().default("#1C4532"),
    avatarUrl: text("avatar_url"),
    city: text("city"),
    neighborhood: text("neighborhood"),
    usualAvailability: text("usual_availability"),
    companySize: text("company_size"),
    roleId: text("role_id"),
    preferredVenues: text("preferred_venues").array().notNull().default(sql`'{}'::text[]`),
    favoriteMeze: text("favorite_meze").array().notNull().default(sql`'{}'::text[]`),
    interests: text("interests").array().notNull().default(sql`'{}'::text[]`),
    earnedBadges: text("earned_badges").array().notNull().default(sql`'{}'::text[]`),
    nonAlcoholicPreferred: boolean("non_alcoholic_preferred").notNull().default(false),
    radarActive: boolean("radar_active").notNull().default(false),
    radarRadiusKm: integer("radar_radius_km").notNull().default(5),
    radarMessage: text("radar_message"),
    /** Timestamp of the 18+ confirmation. No birth date is stored (GDPR). */
    ageConfirmedAt: timestamp("age_confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("users_city_idx").on(t.city)],
);

// ─── rate_limits ──────────────────────────────────────────────────────────────
// Fixed-window counters keyed by e.g. "msg:<userId>" (copied from RouteCrafted).

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start").notNull().defaultNow(),
  count: integer("count").notNull().default(0),
});

// ─── ai_settings ──────────────────────────────────────────────────────────────
// Runtime AI config, e.g. key "model" = "google/gemini-2.5-flash".

export const aiSettings = pgTable("ai_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description").notNull().default(""),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── ai_telemetry ─────────────────────────────────────────────────────────────
// event_id / chronicle_id become foreign keys once those tables exist (phase 2).

export const aiTelemetry = pgTable(
  "ai_telemetry",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    callType: text("call_type"), // 'event_description' | 'chronicle_story' | 'moderation'
    model: text("model"),
    eventId: uuid("event_id"),
    chronicleId: uuid("chronicle_id"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    totalTokens: integer("total_tokens"),
    estimatedCostUsd: numeric("estimated_cost_usd", { precision: 10, scale: 6 }),
    latencyMs: integer("latency_ms"),
    success: boolean("success").notNull().default(true),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("ai_telemetry_created_at_idx").on(t.createdAt)],
);

// ═══ Phase 2: social domain ══════════════════════════════════════════════════
// Derived from apps/legacy-vite/src/types/app.ts. Arrays that were embedded in
// one object (attendees, messages, polls, votes, reactions) are tables, because
// several users write them at once.

export const rsvpStatus = pgEnum("rsvp_status", ["confirmed", "maybe", "declined", "pending_approval"]);
export const mezeStatus = pgEnum("meze_status", ["free", "claimed", "done"]);
export const chronicleVisibility = pgEnum("chronicle_visibility", ["friends", "group", "public"]);
export const notificationType = pgEnum("notification_type", ["invite", "approval", "change", "cancel", "quorum"]);

const ts = (name: string) => timestamp(name, { withTimezone: true });

// ─── groups ───────────────────────────────────────────────────────────────────

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  motto: text("motto").notNull().default(""),
  city: text("city").notNull(),
  regularSchedule: text("regular_schedule").notNull().default(""),
  quorumRequired: integer("quorum_required").notNull().default(3),
  meetingsHeld: integer("meetings_held").notNull().default(0),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    joinedAt: ts("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] }), index("group_members_user_idx").on(t.userId)],
);

export const quorumSlots = pgTable(
  "quorum_slots",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    startsAt: ts("starts_at").notNull(),
  },
  (t) => [index("quorum_slots_group_idx").on(t.groupId)],
);

export const quorumVotes = pgTable(
  "quorum_votes",
  {
    slotId: uuid("slot_id").notNull().references(() => quorumSlots.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.slotId, t.userId] })],
);

// ─── events ───────────────────────────────────────────────────────────────────
// exact_address leaves the server only through toPublicEvent() (lib/events/serialize.ts).
// approx_lat/lng are always the district centre from districtPoint(), never client GPS.

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    organizerId: uuid("organizer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    startsAt: ts("starts_at").notNull(),
    city: text("city").notNull(),
    neighborhood: text("neighborhood").notNull(),
    venueName: text("venue_name").notNull(),
    exactAddress: text("exact_address").notNull(),
    venueType: text("venue_type").notNull(),
    approxLat: doublePrecision("approx_lat").notNull(),
    approxLng: doublePrecision("approx_lng").notNull(),
    maxAttendees: integer("max_attendees").notNull(),
    isPrivate: boolean("is_private").notNull().default(false),
    manualApproval: boolean("manual_approval").notNull().default(false),
    friendsOnly: boolean("friends_only").notNull().default(false),
    plannedFood: text("planned_food").notNull().default(""),
    nonAlcoholicFriendly: boolean("non_alcoholic_friendly").notNull().default(true),
    seasonalTheme: text("seasonal_theme").notNull().default("classic"),
    coverImageUrl: text("cover_image_url"),
    /** Random, URL-safe, >= 10 chars (AGENTS.md rule 6). */
    inviteCode: text("invite_code").notNull().unique(),
    cancelledAt: ts("cancelled_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("events_city_starts_idx").on(t.city, t.startsAt),
    index("events_organizer_idx").on(t.organizerId),
    index("events_group_idx").on(t.groupId),
  ],
);

export const eventAttendees = pgTable(
  "event_attendees",
  {
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: rsvpStatus("status").notNull(),
    isOrganizer: boolean("is_organizer").notNull().default(false),
    nonAlcoholic: boolean("non_alcoholic").notNull().default(false),
    lateMinutes: integer("late_minutes"),
    excuse: text("excuse"),
    joinedAt: ts("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] }), index("event_attendees_user_idx").on(t.userId)],
);

export const eventMessages = pgTable(
  "event_messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    /** NULL after the sender deletes their account ("изтрит участник"). */
    senderId: uuid("sender_id").references(() => users.id, { onDelete: "set null" }),
    text: text("text").notNull().default(""),
    isSystem: boolean("is_system").notNull().default(false),
    isPinned: boolean("is_pinned").notNull().default(false),
    sticker: text("sticker"),
    locationCard: jsonb("location_card").$type<{ venueName: string; neighborhood: string; city: string }>(),
    hiddenAt: ts("hidden_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("event_messages_event_created_idx").on(t.eventId, t.createdAt)],
);

export const messageReactions = pgTable(
  "message_reactions",
  {
    messageId: uuid("message_id").notNull().references(() => eventMessages.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId, t.emoji] })],
);

export const polls = pgTable(
  "polls",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    isOfficialCourt: boolean("is_official_court").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("polls_event_idx").on(t.eventId)],
);

export const pollOptions = pgTable(
  "poll_options",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    pollId: uuid("poll_id").notNull().references(() => polls.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("poll_options_poll_idx").on(t.pollId)],
);

export const pollVotes = pgTable(
  "poll_votes",
  {
    pollId: uuid("poll_id").notNull().references(() => polls.id, { onDelete: "cascade" }),
    optionId: uuid("option_id").notNull().references(() => pollOptions.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  // One vote per user per poll.
  (t) => [uniqueIndex("poll_votes_poll_user_uq").on(t.pollId, t.userId), index("poll_votes_option_idx").on(t.optionId)],
);

export const contributions = pgTable(
  "contributions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    item: text("item").notNull(),
    category: text("category").notNull(), // 'салата' | 'мезе' | 'скара' | 'напитки' | 'логистика'
    status: mezeStatus("status").notNull().default("free"),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("contributions_event_idx").on(t.eventId)],
);

// ─── chronicle & wisdom ──────────────────────────────────────────────────────

export const chronicles = pgTable(
  "chronicles",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    city: text("city").notNull().default(""),
    officialDecision: text("official_decision").notNull().default(""),
    story: text("story").notNull().default(""),
    photoUrl: text("photo_url"),
    visibility: chronicleVisibility("visibility").notNull().default("friends"),
    consentConfirmed: boolean("consent_confirmed").notNull().default(false),
    hiddenAt: ts("hidden_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("chronicles_created_idx").on(t.createdAt), index("chronicles_group_idx").on(t.groupId)],
);

export const chronicleTags = pgTable(
  "chronicle_tags",
  {
    chronicleId: uuid("chronicle_id").notNull().references(() => chronicles.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Tagged person stays hidden until set (AGENTS.md rule 7). */
    consentGivenAt: ts("consent_given_at"),
  },
  (t) => [primaryKey({ columns: [t.chronicleId, t.userId] })],
);

export const chronicleLikes = pgTable(
  "chronicle_likes",
  {
    chronicleId: uuid("chronicle_id").notNull().references(() => chronicles.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.chronicleId, t.userId] })],
);

export const wisdom = pgTable(
  "wisdom",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    quote: text("quote").notNull(),
    quotedUserId: uuid("quoted_user_id").references(() => users.id, { onDelete: "set null" }),
    context: text("context").notNull().default(""),
    consentGiven: boolean("consent_given").notNull().default(false),
    sharedToGroup: boolean("shared_to_group").notNull().default(false),
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("wisdom_created_idx").on(t.createdAt)],
);

// ─── notifications ───────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    readAt: ts("read_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_user_created_idx").on(t.userId, t.createdAt)],
);

// ─── blocks ──────────────────────────────────────────────────────────────────
// Applied in queries, both directions (AGENTS.md rule 5). Endpoints in phase 3.

export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] }), index("blocks_blocked_idx").on(t.blockedId)],
);
