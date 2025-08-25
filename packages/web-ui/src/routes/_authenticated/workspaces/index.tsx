import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/workspaces/")({
  loader: async ({ context }) => {
    const { user } = context;

    if (user?.defaultWorkspaceSlug) {
      throw redirect({
        to: "/workspaces/$workspaceSlug",
        params: { workspaceSlug: user.defaultWorkspaceSlug },
      });
    }
  },
  component: () => {
    // TODO: better UI
    return <div>Select a workspace to continue</div>;
  },
});
