import {
  SidebarInset,
  SidebarProvider,
} from "@openpromo/ui/components/sidebar";
import { cn } from "@openpromo/ui/lib/utils";
import { Outlet } from "@tanstack/react-router";
import { LayoutProvider } from "@/context/layout-provider";
import { AppSidebar } from "../app-sidebar";

type WorkspaceLayoutProps = {
  children?: React.ReactNode;
};

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
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
          <div className="flex-1">{children ?? <Outlet />}</div>
        </SidebarInset>
      </LayoutProvider>
    </SidebarProvider>
  );
}
