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

  const { data: workspaces, isPending } = useHonoQuery({
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
          <SidebarHeader className="p-4 border-b border-sidebar-border/50">
            {isPending ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-sidebar-accent animate-pulse rounded-xl" />
                <div className="flex-1">
                  <div className="h-3 bg-sidebar-accent animate-pulse rounded mb-1" />
                  <div className="h-2 bg-sidebar-accent/50 animate-pulse rounded w-20" />
                </div>
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
          <SidebarContent className="px-2 py-4">
            {sidebarData.navGroups.map((props) => (
              <NavGroup key={props.title} {...props} />
            ))}
          </SidebarContent>
          <SidebarFooter className="px-4 py-4 border-t border-sidebar-border/50">
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
