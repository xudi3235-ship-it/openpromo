import { useLoaderData } from "@tanstack/react-router";

export function useWorkspace() {
  return useLoaderData({
    from: "/_authenticated/workspaces/$workspaceSlug",
  });
}
