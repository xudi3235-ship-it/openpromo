import {
  SidebarInset,
  SidebarProvider,
} from "@openpromo/ui/components/sidebar";
import { cn } from "@openpromo/ui/lib/utils";
import { Outlet } from "@tanstack/react-router";
import { WorkspaceConnectedAccountsBar } from "@/components/workspace/workspace-connected-accounts-bar";
import { LayoutProvider } from "@/context/layout-provider";
import { AppSidebar } from "../app-sidebar";
import { useShouldShowAccountsBar } from "./use-should-show-accounts-bar";

type WorkspaceLayoutProps = {
  children?: React.ReactNode;
  showAccountsBar?: boolean;
};

export function WorkspaceLayout({
  children,
  showAccountsBar,
}: WorkspaceLayoutProps) {
  const shouldShowAccountsBar = useShouldShowAccountsBar(showAccountsBar);

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
