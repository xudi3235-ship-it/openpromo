import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/labs",
)({
  beforeLoad: async ({ context, params }) => {
    const { user } = context;
    const isInternal = user.featureFlags.includes("is_internal");

    if (!isInternal) {
      throw redirect({
        to: "/workspaces/$workspaceSlug",
        params: { workspaceSlug: params.workspaceSlug },
      });
    }
  },
  component: Outlet,
});
