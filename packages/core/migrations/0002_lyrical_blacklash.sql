ALTER TABLE "workspace_roles" ALTER COLUMN "slug" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."workspace_role_types";--> statement-breakpoint
CREATE TYPE "public"."workspace_role_types" AS ENUM('workspace_admin', 'workspace_editor', 'workspace_viewer');--> statement-breakpoint
ALTER TABLE "workspace_roles" ALTER COLUMN "slug" SET DATA TYPE "public"."workspace_role_types" USING "slug"::"public"."workspace_role_types";