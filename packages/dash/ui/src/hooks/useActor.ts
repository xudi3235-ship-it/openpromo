import { useRouteContext } from "@tanstack/react-router";
import { useWorkspace } from "./useWorkspace";

export function useActor() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  return user;
}

export function useInternal() {
  const user = useActor();
  return user.featureFlags.includes("is_internal");
}

export type Actor = ReturnType<typeof useActor>;

export function useWorkspaceActor() {
  const { workspace } = useWorkspace();
  return workspace.actor;
}
