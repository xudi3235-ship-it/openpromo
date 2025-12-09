ALTER TABLE "agent_run" ALTER COLUMN "input" SET DEFAULT '{"prompt":"empty prompt","mode":"video_gen","productImages":[],"avatarImages":[],"referenceImages":[],"brandAssets":[]}'::jsonb;--> statement-breakpoint
ALTER TABLE "agent_run" DROP COLUMN "agent_name";--> statement-breakpoint
DROP TYPE "public"."agent_run_agent";