CREATE TYPE "public"."candidate_status" AS ENUM('generated', 'saved', 'rejected', 'shortlisted');--> statement-breakpoint
CREATE TYPE "public"."checkout_intent_status" AS ENUM('created', 'provider_unconfigured', 'pending', 'completed', 'expired', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."entity_status" AS ENUM('active', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."generation_run_status" AS ENUM('pending', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."paid_pack_status" AS ENUM('none', 'pending', 'paid');--> statement-breakpoint
CREATE TYPE "public"."project_access_type" AS ENUM('free_preview', 'paid_pack');--> statement-breakpoint
CREATE TYPE "public"."provider_event_status" AS ENUM('received', 'processed', 'ignored', 'failed');--> statement-breakpoint
CREATE TYPE "public"."report_format" AS ENUM('markdown', 'pdf', 'csv');--> statement-breakpoint
CREATE TYPE "public"."screening_run_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "anonymous_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"session_hash" text NOT NULL,
	"merged_user_id" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "anonymous_sessions_session_hash_unique" UNIQUE("session_hash")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"project_id" text,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"names" integer DEFAULT 0 NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"generation_run_id" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text NOT NULL,
	"lane" text NOT NULL,
	"rationale" text NOT NULL,
	"pronunciation" text NOT NULL,
	"spelling_risk" text NOT NULL,
	"tone_tags" jsonb NOT NULL,
	"scores" jsonb NOT NULL,
	"status" "candidate_status" DEFAULT 'generated' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkout_intents" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"provider" text NOT NULL,
	"status" "checkout_intent_status" DEFAULT 'created' NOT NULL,
	"external_checkout_id" text,
	"checkout_url" text,
	"amount_cents" integer DEFAULT 500 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "free_preview_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"anon_session_hash" text,
	"project_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"status" "generation_run_status" DEFAULT 'pending' NOT NULL,
	"model" text NOT NULL,
	"access_type" "project_access_type" NOT NULL,
	"prompt_version" text NOT NULL,
	"schema_version" text NOT NULL,
	"validation_status" text NOT NULL,
	"output_snapshot" jsonb,
	"cost_estimate_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_org_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_clerk_org_id_unique" UNIQUE("clerk_org_id")
);
--> statement-breakpoint
CREATE TABLE "product_events" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"event_name" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_packs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"status" "paid_pack_status" DEFAULT 'pending' NOT NULL,
	"provider" text NOT NULL,
	"external_checkout_id" text,
	"external_payment_id" text,
	"amount_cents" integer DEFAULT 500 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"brief" jsonb NOT NULL,
	"access_type" "project_access_type" DEFAULT 'free_preview' NOT NULL,
	"paid_pack_status" "paid_pack_status" DEFAULT 'none' NOT NULL,
	"status" "entity_status" DEFAULT 'active' NOT NULL,
	"strict_confidential_mode" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"external_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"status" "provider_event_status" DEFAULT 'received' NOT NULL,
	"payload_hash" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_results" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"screening_run_id" text NOT NULL,
	"candidate_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_version" text NOT NULL,
	"check_type" text NOT NULL,
	"label" text NOT NULL,
	"source" text NOT NULL,
	"query" text NOT NULL,
	"jurisdiction" text,
	"matched_fields" jsonb NOT NULL,
	"summary" text NOT NULL,
	"raw_payload_hash" text,
	"freshness" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"format" "report_format" DEFAULT 'markdown' NOT NULL,
	"markdown" text NOT NULL,
	"candidate_ids" jsonb NOT NULL,
	"disclaimer_version" text NOT NULL,
	"prompt_version" text NOT NULL,
	"scoring_version" text NOT NULL,
	"screening_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "retention_tombstones" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"org_id" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screening_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"status" "screening_run_status" DEFAULT 'running' NOT NULL,
	"source_mode" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_generation_run_id_generation_runs_id_fk" FOREIGN KEY ("generation_run_id") REFERENCES "public"."generation_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_intents" ADD CONSTRAINT "checkout_intents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "free_preview_claims" ADD CONSTRAINT "free_preview_claims_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_packs" ADD CONSTRAINT "project_packs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_results" ADD CONSTRAINT "provider_results_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_results" ADD CONSTRAINT "provider_results_screening_run_id_screening_runs_id_fk" FOREIGN KEY ("screening_run_id") REFERENCES "public"."screening_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_results" ADD CONSTRAINT "provider_results_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_runs" ADD CONSTRAINT "screening_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "free_preview_claims_user_idx" ON "free_preview_claims" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "free_preview_claims_anon_session_idx" ON "free_preview_claims" USING btree ("anon_session_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_org_idx" ON "memberships" USING btree ("user_id","org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_packs_project_idx" ON "project_packs" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_packs_payment_idx" ON "project_packs" USING btree ("provider","external_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_events_external_idx" ON "provider_events" USING btree ("provider","external_event_id");