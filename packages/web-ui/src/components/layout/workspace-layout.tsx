import { Outlet, useParams, useRouteContext } from "@tanstack/react-router";
import { cn } from "@/components/lib/utils";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import { LayoutProvider } from "@/context/layout-provider";
import { useHonoQuery } from "@/lib/hono-client";
import { QUERY_KEYS } from "@/lib/query";
import { AppSidebar } from "../ui/app-sidebar";
import { WorkspaceSwitcher } from "../ui/workspace-switcher";
import { sidebarData } from "./data/sidebar-data";
import { NavGroup } from "./nav-group";
import { NavUser } from "./nav-user";

type WorkspaceLayoutProps = {
  children?: React.ReactNode;
};

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const { user } = useRouteContext({ from: "/_authenticated" });

  const { data: workspaces } = useHonoQuery({
    queryKey: QUERY_KEYS.WORKSPACES,
    queryFn: (api) => api.workspaces.$get(),
  });

  const { workspaceSlug: currentWorkspaceSlug } =
    useParams({
      from: "/_authenticated/workspaces/$workspaceSlug",
      shouldThrow: false,
    }) ?? {};

  return (
    <SidebarProvider>
      <LayoutProvider>
        <AppSidebar>
          <SidebarHeader>
            {workspaces && (
              <WorkspaceSwitcher
                currentWorkspaceSlug={currentWorkspaceSlug}
                workspaces={workspaces}
                defaultWorkspaceSlug={user.defaultWorkspaceSlug}
              />
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
        </AppSidebar>
        <SidebarInset
          className={cn(
            // If layout is fixed, set the height
            // to 100svh to prevent overflow
            "has-[[data-layout=fixed]]:h-svh",

            // If layout is fixed and sidebar is inset,
            // set the height to 100svh - 1rem (total margins) to prevent overflow
            // 'peer-data-[variant=inset]:has-[[data-layout=fixed]]:h-[calc(100svh-1rem)]',
            "peer-data-[variant=inset]:has-[[data-layout=fixed]]:h-[calc(100svh-(var(--spacing)*4))]",

            // Set content container, so we can use container queries
            "@container/content",
          )}
        >
          {children ?? <Outlet />}
        </SidebarInset>
      </LayoutProvider>
    </SidebarProvider>
  );
}
