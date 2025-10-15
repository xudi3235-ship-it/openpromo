import { useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  notFound,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { toast } from "sonner";
import ComposerDialog from "@/components/composer/modal/dialog-composer";
import { WorkspaceLoading } from "@/components/loading/workspace-loading";
import { WorkspaceConnectedAccountsBar } from "@/components/workspace/workspace-connected-accounts-bar";
import { WorkspaceNullState } from "@/components/workspace/workspace-null-state";
import { WorkspaceWebSocketProvider } from "@/hooks/useWorkspaceWebSocket";
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
  pendingComponent: WorkspaceLoading,
});

const DISABLED_ACCOUNTS_BAR_PATTERNS: RegExp[] = [
  /^\/workspaces\/[^/]+\/composer\/?$/,
];

function WorkspaceComponent() {
  const { workspace } = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accounts, isLoading } = useConnectedAccounts();
  const { location } = useRouterState();

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

  const shouldShowAccountsBar = !DISABLED_ACCOUNTS_BAR_PATTERNS.some(
    (pattern) => pattern.test(location.pathname),
  );

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
    <WorkspaceWebSocketProvider workspaceSlug={workspace.slug}>
      <div className="flex h-full flex-col gap-4">
        {shouldShowAccountsBar && (
          <WorkspaceConnectedAccountsBar className="mx-4 mt-4" />
        )}
        <div className="flex flex-col flex-1 min-h-0 p-4">
          <Outlet />
        </div>
      </div>

      {/* Global Composer Dialog - can be opened from anywhere in the workspace */}
      <ComposerDialog />
    </WorkspaceWebSocketProvider>
  );
}
