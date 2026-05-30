CREATE TABLE "ai_usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"project_id" text,
	"generation_run_id" text,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"task" text NOT NULL,
	"prompt_version" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_micro_cents" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_cache_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"check_type" text NOT NULL,
	"cache_key" text NOT NULL,
	"query_hash" text NOT NULL,
	"result_payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_generation_run_id_generation_runs_id_fk" FOREIGN KEY ("generation_run_id") REFERENCES "public"."generation_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_cache_entries_key_idx" ON "provider_cache_entries" USING btree ("provider","check_type","cache_key");