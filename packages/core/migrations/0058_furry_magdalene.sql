-- Convert existing text logs to jsonb array; keep empty/NULL as [].
ALTER TABLE "agent_run"
	ALTER COLUMN "logs" SET DATA TYPE jsonb USING (
		CASE
			WHEN "logs" IS NULL OR "logs" = '' THEN '[]'::jsonb
			ELSE to_jsonb(string_to_array("logs", E'\n'))
		END
	);--> statement-breakpoint

ALTER TABLE "agent_run" ALTER COLUMN "logs" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "agent_run" ALTER COLUMN "logs" SET NOT NULL;