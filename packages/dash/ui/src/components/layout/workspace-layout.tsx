import {
  SidebarInset,
  SidebarProvider,
} from "@openpromo/ui/components/sidebar";
import { cn } from "@openpromo/ui/lib/utils";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { WorkspaceConnectedAccountsBar } from "@/components/workspace/workspace-connected-accounts-bar";
import { LayoutProvider } from "@/context/layout-provider";
import { AppSidebar } from "../app-sidebar";

type WorkspaceLayoutProps = {
  children?: React.ReactNode;
};

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const isComposerRoute = pathname.includes("/composer");
  const isWorkspaceHome = /^\/workspaces\/[^/]+\/?$/.test(pathname);
  const shouldShowAccountsBar = !(isComposerRoute || isWorkspaceHome);

  return (
    <SidebarProvider>
      <LayoutProvider>
        <AppSidebar />
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
          <div className="flex h-full flex-col gap-4">
            {shouldShowAccountsBar && (
              <WorkspaceConnectedAccountsBar className="mx-4 mt-4" />
            )}
            <div className="flex-1">{children ?? <Outlet />}</div>
          </div>
        </SidebarInset>
      </LayoutProvider>
    </SidebarProvider>
  );
}
