import { useRouteContext } from "@tanstack/react-router";

/**
 * Hook to get the current authenticated user (actor) from the route context.
 * This hook provides easy access to the current user's information throughout the app.
 *
 * @returns The authenticated user object with properties like id, email, firstName, lastName, etc.
 *
 * @example
 * const actor = useActor();
 * console.log(actor.email); // user@example.com
 * console.log(actor.id); // user_01H...
 */
export function useActor() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  return user;
}

/**
 * Type helper to check if a user ID matches the current actor's ID.
 * Useful for determining if a member/user is the currently logged-in user.
 *
 * @example
 * const actor = useActor();
 * const isCurrentUser = member.user.id === actor.id;
 */
export type Actor = ReturnType<typeof useActor>;
