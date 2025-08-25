CREATE TABLE "workspace_role_assignments" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"role_id" "ulid" NOT NULL,
	"assignee_type" "assignee_type" NOT NULL,
	"assignee_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_roles" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" "workspace_role_types" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_organizationId_slug_unique" UNIQUE("organization_id","slug")
);
--> statement-breakpoint
ALTER TABLE "workspace_role_assignments" ADD CONSTRAINT "workspace_role_assignments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_role_assignments" ADD CONSTRAINT "workspace_role_assignments_role_id_workspace_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."workspace_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_role_assignments_assignee_id_workspace_id_index" ON "workspace_role_assignments" USING btree ("assignee_id","workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_role_assignments_workspace_id_index" ON "workspace_role_assignments" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspaces_organization_id_id_index" ON "workspaces" USING btree ("organization_id","id");
