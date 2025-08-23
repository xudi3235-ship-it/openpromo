import { workspaceRoles } from "@/schema/workspace_roles.sql";
import { db } from "..";

async function main() {
  try {
    const existingRoles = await db().select().from(workspaceRoles);
    if (existingRoles.length > 0) {
      console.log("Roles already exist, skipping seeding");
      return;
    }

    await db()
      .insert(workspaceRoles)
      .values([
        {
          name: "Admin",
          slug: "workspace_admin",
        },
        {
          name: "Editor",
          slug: "workspace_editor",
        },
        {
          name: "Viewer",
          slug: "workspace_viewer",
        },
      ]);
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  }
}

main();
