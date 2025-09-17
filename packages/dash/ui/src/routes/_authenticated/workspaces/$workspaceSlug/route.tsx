import { useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  notFound,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { toast } from "sonner";
import { WorkspaceNullState } from "@/components/workspace/workspace-null-state";
import { honoApiCall, useHonoMutation } from "@/lib/hono-client";
import { QUERY_KEYS } from "@/lib/query";
import { useConnectedAccounts } from "@/queries/connected-account";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug",
)({
  loader: async ({ params }) => {
    const workspace = await honoApiCall((api) =>
      api.workspaces[":workspaceSlug"].$get({
        param: {
          workspaceSlug: params.workspaceSlug,
        },
      }),
    );
    if (workspace.success) {
      return { workspace: workspace.data };
    }
    if (workspace.error.status === 404) {
      throw notFound();
    }
    throw new Error(workspace.error.message);
  },
  staleTime: 1000 * 60, // 1 minute
  component: WorkspaceComponent,
});

function WorkspaceComponent() {
  const { workspace } = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accounts, isLoading } = useConnectedAccounts();

  const { mutate: _ } = useHonoMutation({
    mutationFn: (api) =>
      api.workspaces[":workspaceSlug"].$delete({
        param: {
          workspaceSlug: workspace.slug,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACES });
      toast.success(`Workspace ${workspace.name} deleted`);
      navigate({ to: "/workspaces" });
    },
  });

  if (!isLoading && accounts.length === 0) {
    return (
      <WorkspaceNullState
        title={`Welcome to ${workspace.name}`}
        description="Connect your social media accounts to start creating and scheduling content"
        footerText="Choose a platform above to get started"
      />
    );
  }

  return (
    <div className="flex-1">
      <Outlet />
    </div>
  );
}
