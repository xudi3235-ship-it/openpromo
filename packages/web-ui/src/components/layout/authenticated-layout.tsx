import { Outlet } from "@tanstack/react-router";
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
import { getCookie } from "@/lib/cookies";
import { AppSidebar } from "../ui/app-sidebar";
import { TeamSwitcher } from "../ui/team-switcher";
import { sidebarData } from "./data/sidebar-data";
import { NavGroup } from "./nav-group";
import { NavUser } from "./nav-user";

type AuthenticatedLayoutProps = {
  children?: React.ReactNode;
};

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie("sidebar_state") !== "false";
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <LayoutProvider>
        <AppSidebar>
          <SidebarHeader>
            <TeamSwitcher teams={sidebarData.teams} />
          </SidebarHeader>
          <SidebarContent>
            {sidebarData.navGroups.map((props) => (
              <NavGroup key={props.title} {...props} />
            ))}
          </SidebarContent>
          <SidebarFooter>
            <NavUser user={sidebarData.user} />
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
