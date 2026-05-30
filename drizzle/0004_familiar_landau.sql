ALTER TABLE "job_runs" ADD COLUMN "max_attempts" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_runs" ADD COLUMN "run_after" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "job_runs" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_runs" ADD COLUMN "locked_by" text;--> statement-breakpoint
CREATE INDEX "job_runs_claim_idx" ON "job_runs" USING btree ("status","run_after","created_at");--> statement-breakpoint
CREATE INDEX "job_runs_lock_idx" ON "job_runs" USING btree ("status","locked_at");