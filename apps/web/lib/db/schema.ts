import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
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
