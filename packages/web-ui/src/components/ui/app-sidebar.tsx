import { useLayout } from "@/context/layout-provider";
import { Sidebar } from "./sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { collapsible, variant } = useLayout();
  return (
    <Sidebar
      {...props}
      collapsible={collapsible}
      variant={variant}
      className="bg-gradient-to-b from-sidebar to-sidebar/95 backdrop-blur-sm border-r border-sidebar-border/30 shadow-sm"
    />
  );
}
