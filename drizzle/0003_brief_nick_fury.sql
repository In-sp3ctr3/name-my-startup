CREATE TYPE "public"."job_run_status" AS ENUM('queued', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_run_type" AS ENUM('generation', 'screening', 'report');--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"project_id" text,
	"job_type" "job_run_type" NOT NULL,
	"status" "job_run_status" DEFAULT 'queued' NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_payload" jsonb NOT NULL,
	"result_payload" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_runs_idempotency_idx" ON "job_runs" USING btree ("idempotency_key");