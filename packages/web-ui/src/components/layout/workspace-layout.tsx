import { Outlet } from "@tanstack/react-router";
import { cn } from "@/components/lib/utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { LayoutProvider } from "@/context/layout-provider";
import { AppSidebar } from "../ui/app-sidebar";

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
          {children ?? <Outlet />}
        </SidebarInset>
      </LayoutProvider>
    </SidebarProvider>
  );
}
