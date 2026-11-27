CREATE TYPE "public"."chronicle_visibility" AS ENUM('friends', 'group', 'public');--> statement-breakpoint
CREATE TYPE "public"."meze_status" AS ENUM('free', 'claimed', 'done');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('invite', 'approval', 'change', 'cancel', 'quorum');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('confirmed', 'maybe', 'declined', 'pending_approval');--> statement-breakpoint
CREATE TABLE "blocks" (
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "chronicle_likes" (
	"chronicle_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "chronicle_likes_chronicle_id_user_id_pk" PRIMARY KEY("chronicle_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "chronicle_tags" (
	"chronicle_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"consent_given_at" timestamp with time zone,
	CONSTRAINT "chronicle_tags_chronicle_id_user_id_pk" PRIMARY KEY("chronicle_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "chronicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"group_id" uuid,
	"author_id" uuid,
	"title" text NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"official_decision" text DEFAULT '' NOT NULL,
	"story" text DEFAULT '' NOT NULL,
	"photo_url" text,
	"visibility" "chronicle_visibility" DEFAULT 'friends' NOT NULL,
	"consent_confirmed" boolean DEFAULT false NOT NULL,
	"hidden_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"item" text NOT NULL,
	"category" text NOT NULL,
	"status" "meze_status" DEFAULT 'free' NOT NULL,
	"assigned_to_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_attendees" (
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "rsvp_status" NOT NULL,
	"is_organizer" boolean DEFAULT false NOT NULL,
	"non_alcoholic" boolean DEFAULT false NOT NULL,
	"late_minutes" integer,
	"excuse" text,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_attendees_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "event_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"sender_id" uuid,
	"text" text DEFAULT '' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"sticker" text,
	"location_card" jsonb,
	"hidden_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizer_id" uuid NOT NULL,
	"group_id" uuid,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"city" text NOT NULL,
	"neighborhood" text NOT NULL,
	"venue_name" text NOT NULL,
	"exact_address" text NOT NULL,
	"venue_type" text NOT NULL,
	"approx_lat" double precision NOT NULL,
	"approx_lng" double precision NOT NULL,
	"max_attendees" integer NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"manual_approval" boolean DEFAULT false NOT NULL,
	"friends_only" boolean DEFAULT false NOT NULL,
	"planned_food" text DEFAULT '' NOT NULL,
	"non_alcoholic_friendly" boolean DEFAULT true NOT NULL,
	"seasonal_theme" text DEFAULT 'classic' NOT NULL,
	"cover_image_url" text,
	"invite_code" text NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_members_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"motto" text DEFAULT '' NOT NULL,
	"city" text NOT NULL,
	"regular_schedule" text DEFAULT '' NOT NULL,
	"quorum_required" integer DEFAULT 3 NOT NULL,
	"meetings_held" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_reactions" (
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	CONSTRAINT "message_reactions_message_id_user_id_emoji_pk" PRIMARY KEY("message_id","user_id","emoji")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"event_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"poll_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"question" text NOT NULL,
	"created_by" uuid,
	"is_official_court" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quorum_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"label" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quorum_votes" (
	"slot_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "quorum_votes_slot_id_user_id_pk" PRIMARY KEY("slot_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "wisdom" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid,
	"quote" text NOT NULL,
	"quoted_user_id" uuid,
	"context" text DEFAULT '' NOT NULL,
	"consent_given" boolean DEFAULT false NOT NULL,
	"shared_to_group" boolean DEFAULT false NOT NULL,
	"group_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chronicle_likes" ADD CONSTRAINT "chronicle_likes_chronicle_id_chronicles_id_fk" FOREIGN KEY ("chronicle_id") REFERENCES "public"."chronicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chronicle_likes" ADD CONSTRAINT "chronicle_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chronicle_tags" ADD CONSTRAINT "chronicle_tags_chronicle_id_chronicles_id_fk" FOREIGN KEY ("chronicle_id") REFERENCES "public"."chronicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chronicle_tags" ADD CONSTRAINT "chronicle_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chronicles" ADD CONSTRAINT "chronicles_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chronicles" ADD CONSTRAINT "chronicles_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chronicles" ADD CONSTRAINT "chronicles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_messages" ADD CONSTRAINT "event_messages_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_messages" ADD CONSTRAINT "event_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_event_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."event_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_option_id_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."poll_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quorum_slots" ADD CONSTRAINT "quorum_slots_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quorum_votes" ADD CONSTRAINT "quorum_votes_slot_id_quorum_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."quorum_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quorum_votes" ADD CONSTRAINT "quorum_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wisdom" ADD CONSTRAINT "wisdom_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wisdom" ADD CONSTRAINT "wisdom_quoted_user_id_users_id_fk" FOREIGN KEY ("quoted_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wisdom" ADD CONSTRAINT "wisdom_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blocks_blocked_idx" ON "blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "chronicles_created_idx" ON "chronicles" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "chronicles_group_idx" ON "chronicles" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "contributions_event_idx" ON "contributions" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_attendees_user_idx" ON "event_attendees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_messages_event_created_idx" ON "event_messages" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE INDEX "events_city_starts_idx" ON "events" USING btree ("city","starts_at");--> statement-breakpoint
CREATE INDEX "events_organizer_idx" ON "events" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "events_group_idx" ON "events" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_members_user_idx" ON "group_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "poll_options_poll_idx" ON "poll_options" USING btree ("poll_id");--> statement-breakpoint
CREATE UNIQUE INDEX "poll_votes_poll_user_uq" ON "poll_votes" USING btree ("poll_id","user_id");--> statement-breakpoint
CREATE INDEX "poll_votes_option_idx" ON "poll_votes" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "polls_event_idx" ON "polls" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "quorum_slots_group_idx" ON "quorum_slots" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "wisdom_created_idx" ON "wisdom" USING btree ("created_at");