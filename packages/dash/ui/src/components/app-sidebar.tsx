import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@openpromo/ui/components/sidebar";
import { useParams, useRouteContext } from "@tanstack/react-router";
import { useLayout } from "@/context/layout-provider";
import { useHonoQuery } from "@/lib/hono-client";
import { QUERY_KEYS } from "@/lib/query";
import { sidebarData } from "./layout/data/sidebar-data";
import { NavGroup } from "./layout/nav-group";
import { NavUser } from "./layout/nav-user";
import { WorkspaceSwitcher } from "./workspace-switcher";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { collapsible, variant } = useLayout();
  const { state } = useSidebar();
  const { data: workspaces, isPending } = useHonoQuery({
    queryKey: QUERY_KEYS.WORKSPACES,
    queryFn: (api) => api.workspaces.$get(),
  });
  const { workspaceSlug: currentWorkspaceSlug } =
    useParams({
      from: "/_authenticated/workspaces/$workspaceSlug",
      shouldThrow: false,
    }) ?? {};
  const { user } = useRouteContext({ from: "/_authenticated" });

  return (
    <Sidebar {...props} collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        {isPending ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sidebar-accent animate-pulse rounded-xl shrink-0" />
            {state === "expanded" && (
              <div className="flex-1">
                <div className="h-3 bg-sidebar-accent animate-pulse rounded mb-1" />
                <div className="h-2 bg-sidebar-accent/50 animate-pulse rounded w-20" />
              </div>
            )}
          </div>
        ) : (
          workspaces && (
            <WorkspaceSwitcher
              currentWorkspaceSlug={currentWorkspaceSlug}
              workspaces={workspaces}
              defaultWorkspaceSlug={user.defaultWorkspaceSlug}
            />
          )
        )}
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
