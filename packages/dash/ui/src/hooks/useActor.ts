import { useRouteContext } from "@tanstack/react-router";

export function useActor() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  return user;
}

export type Actor = ReturnType<typeof useActor>;
