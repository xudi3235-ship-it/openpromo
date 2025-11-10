import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@openpromo/ui/components/sidebar";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouteContext } from "@tanstack/react-router";
import { useLayout } from "@/context/layout-provider";
import { orpc } from "@/lib/orpc-client";
import { useSidebarData } from "./layout/data/sidebar-data";
import { NavGroup } from "./layout/nav-group";
import { NavUser } from "./layout/nav-user";
import { WebSocketStatusIndicator } from "./layout/websocket-status-indicator";
import { WorkspaceSwitcher } from "./workspace-switcher";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { collapsible, variant } = useLayout();
  const { state } = useSidebar();
  const { data: workspaces, isPending } = useQuery(
    orpc.workspaces.list.queryOptions({
      input: {},
    }),
  );
  const { workspaceSlug: currentWorkspaceSlug } =
    useParams({
      from: "/_authenticated/workspaces/$workspaceSlug",
      shouldThrow: false,
    }) ?? {};
  const { user } = useRouteContext({ from: "/_authenticated" });

  const sidebarData = useSidebarData();

  return (
    <Sidebar {...props} collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2">
          {isPending ? (
            <div className="flex items-center gap-3 flex-1">
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
              <div className="flex-1">
                <WorkspaceSwitcher
                  currentWorkspaceSlug={currentWorkspaceSlug}
                  workspaces={workspaces.workspaces}
                  defaultWorkspaceSlug={user.defaultWorkspaceSlug}
                />
              </div>
            )
          )}
          {currentWorkspaceSlug && <WebSocketStatusIndicator />}
          <SidebarTrigger
            variant="outline"
            className="max-md:scale-125 shrink-0"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((group) => (
          <NavGroup
            key={group.title}
            {...group}
            workspaceSlug={currentWorkspaceSlug}
          />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
