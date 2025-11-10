import { useLoaderData } from "@tanstack/react-router";

export function useWorkspace() {
  return useLoaderData({
    from: "/_authenticated/workspaces/$workspaceSlug",
  });
}

export function useWorkspaceID() {
  const { workspace } = useWorkspace();
  return workspace.id;
}

export function useWorkspaceSlug() {
  const { workspace } = useWorkspace();
  return workspace.slug;
}
