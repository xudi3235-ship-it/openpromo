import { useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  notFound,
  Outlet,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switcher";
import { honoApiCall, useHonoMutation } from "@/lib/hono-client";
import { QUERY_KEYS } from "@/lib/query";

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
  component: WorkspaceComponent,
});

function WorkspaceComponent() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const { workspace } = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <div className="ms-auto flex items-center space-x-4">
          {/* <Search />
          <ConfigDrawer /> */}
          <ThemeSwitch />
          <ProfileDropdown user={user} />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <Outlet />
      </Main>
    </>
  );
}
