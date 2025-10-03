CREATE TYPE "public"."consent_status" AS ENUM('pending', 'granted', 'denied', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'mismatch', 'unclear', 'failed');--> statement-breakpoint
CREATE TABLE "consent_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"initiator_user_id" varchar NOT NULL,
	"participant_name" text NOT NULL,
	"participant_phone" text,
	"participant_age" integer NOT NULL,
	"consent_status" "consent_status" DEFAULT 'pending' NOT NULL,
	"session_start_time" timestamp DEFAULT now() NOT NULL,
	"consent_granted_time" timestamp,
	"consent_revoked_time" timestamp,
	"qr_code_id" text NOT NULL,
	"video_asset_id" varchar,
	"retention_until" timestamp NOT NULL,
	"delete_after_days" integer DEFAULT 90 NOT NULL,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"ai_analysis_result" text,
	"has_audio_mismatch" boolean DEFAULT false,
	"verified_at" timestamp,
	"button_choice" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text,
	"phone_number" text,
	"profile_picture" text,
	"profile_picture_url" text,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"subscription_status" text,
	"subscription_plan" text,
	"subscription_end_date" timestamp,
	"account_deletion_date" timestamp,
	"role" text DEFAULT 'user' NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "video_assets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"original_name" text,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"duration" integer,
	"resolution" text,
	"storage_key" text NOT NULL,
	"storage_url" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"is_encrypted" boolean DEFAULT true NOT NULL,
	"checksum" text,
	"transcript" text,
	"transcription_confidence" integer,
	"transcribed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "consent_sessions" ADD CONSTRAINT "consent_sessions_initiator_user_id_users_id_fk" FOREIGN KEY ("initiator_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_sessions" ADD CONSTRAINT "consent_sessions_video_asset_id_video_assets_id_fk" FOREIGN KEY ("video_asset_id") REFERENCES "public"."video_assets"("id") ON DELETE no action ON UPDATE no action;