import type { DbClient } from "@core/database/db";
import { usersTable } from "@core/schemas/users.sql";
import { env } from "@core/utils/env";
import { eq } from "drizzle-orm";

/**
 * Ensures a user exists in the current environment's database.
 *
 * This function handles the multi-environment isolation pattern where:
 * - WorkOS manages centralized user/org authentication (shared across environments)
 * - Each environment (local/staging/production) has its own separate database
 * - Users are automatically created in each environment's DB on first access
 *
 * @param db - Database client for the current environment
 * @param workosUserId - The WorkOS user ID (same across all environments)
 * @returns The environment-specific user record with local ULID
 */
export async function ensureUserInEnvironment(
  db: DbClient,
  workosUserId: string,
): Promise<typeof usersTable.$inferSelect> {
  // Check if user already exists in this environment's database
  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.workosId, workosUserId))
    .limit(1);

  if (existingUser) {
    return existingUser;
  }

  // First time this WorkOS user is accessing THIS environment
  // Create a new user record with environment-specific ULID
  const [newUser] = await db
    .insert(usersTable)
    .values({
      workosId: workosUserId,
      defaultWorkspaceSlug: null,
    })
    .returning();

  console.log(
    `[${env.VITE_ENVIRONMENT}] Created new user record for WorkOS user ${workosUserId}: ${newUser.id}`,
  );

  return newUser;
}
