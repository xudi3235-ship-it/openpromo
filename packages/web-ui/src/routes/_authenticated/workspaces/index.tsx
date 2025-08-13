import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/workspaces/")({
  loader: async ({ context }) => {
    const { user } = context;
    if (!user) {
      throw redirect({ to: "/login" });
    }

    // get default workspace id
    const defaultWorkspaceId = 0;
    throw redirect({
      to: "/workspaces/$workspaceId",
      params: { workspaceId: `${defaultWorkspaceId}` },
    });
  },
});
