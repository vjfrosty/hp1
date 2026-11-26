CREATE TABLE "ai_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "ai_telemetry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_type" text,
	"model" text,
	"event_id" uuid,
	"chronicle_id" uuid,
	"user_id" uuid,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"estimated_cost_usd" numeric(10, 6),
	"latency_ms" integer,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"nickname" text DEFAULT '' NOT NULL,
	"avatar_initials" text DEFAULT '' NOT NULL,
	"avatar_color" text DEFAULT '#1C4532' NOT NULL,
	"avatar_url" text,
	"city" text,
	"neighborhood" text,
	"usual_availability" text,
	"company_size" text,
	"role_id" text,
	"preferred_venues" text[] DEFAULT '{}'::text[] NOT NULL,
	"favorite_meze" text[] DEFAULT '{}'::text[] NOT NULL,
	"interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"earned_badges" text[] DEFAULT '{}'::text[] NOT NULL,
	"non_alcoholic_preferred" boolean DEFAULT false NOT NULL,
	"radar_active" boolean DEFAULT false NOT NULL,
	"radar_radius_km" integer DEFAULT 5 NOT NULL,
	"radar_message" text,
	"age_confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_telemetry" ADD CONSTRAINT "ai_telemetry_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_telemetry_created_at_idx" ON "ai_telemetry" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_city_idx" ON "users" USING btree ("city");