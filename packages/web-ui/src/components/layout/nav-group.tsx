import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type {
  NavCollapsible,
  NavGroup as NavGroupProps,
  NavLink,
} from "./types";

export function NavGroup({ title, items }: NavGroupProps) {
  const { state, isMobile } = useSidebar();
  return (
    <SidebarGroup className="mb-6">
      <SidebarGroupLabel className="text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wider mb-3">
        {title}
      </SidebarGroupLabel>
      <SidebarMenu className="space-y-1">
        {items.map((item) => {
          const key = `${item.title}-${item.url}`;

          if (!item.items) return <SidebarMenuLink key={key} item={item} />;

          if (state === "collapsed" && !isMobile)
            return <SidebarMenuCollapsedDropdown key={key} item={item} />;

          return <SidebarMenuCollapsible key={key} item={item} />;
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavBadge({ children }: { children: ReactNode }) {
  return (
    <Badge className="rounded-full px-2 py-0.5 text-xs bg-[var(--green-fill)] text-[var(--green-text)] border border-[var(--green-stroke)] font-medium">
      {children}
    </Badge>
  );
}

function SidebarMenuLink({ item }: { item: NavLink }) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <Link
        to={item.url}
        onClick={() => setOpenMobile(false)}
        activeOptions={{ exact: true }}
      >
        {({ isActive }) => (
          <SidebarMenuButton
            tooltip={item.title}
            className={`h-10 px-3 font-medium transition-all duration-200 rounded-lg ${
              isActive
                ? "bg-[var(--neutral-800)] text-white"
                : "text-[var(--neutral-700)] hover:bg-sidebar-accent hover:text-[var(--neutral-900)]"
            }`}
          >
            {item.icon && <item.icon className="w-5 h-5 mr-3" />}
            <span className="flex-1">{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
          </SidebarMenuButton>
        )}
      </Link>
    </SidebarMenuItem>
  );
}

function SidebarMenuCollapsible({ item }: { item: NavCollapsible }) {
  const routerState = useRouterState();
  const { setOpenMobile } = useSidebar();
  const hasActiveChild = item.items.some(
    (subItem) => routerState.location.pathname === subItem.url,
  );

  return (
    <Collapsible
      asChild
      defaultOpen={hasActiveChild}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            className="h-10 px-3 font-medium text-[var(--neutral-700)] hover:bg-sidebar-accent hover:text-[var(--neutral-900)] transition-all duration-200 rounded-lg"
          >
            {item.icon && <item.icon className="w-5 h-5 mr-3" />}
            <span className="flex-1">{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className="w-4 h-4 ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="CollapsibleContent">
          <SidebarMenuSub>
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <Link
                  to={subItem.url}
                  onClick={() => setOpenMobile(false)}
                  activeOptions={{ exact: true }}
                >
                  {({ isActive }) => (
                    <SidebarMenuSubButton
                      className={`transition-all duration-200 ${
                        isActive
                          ? "bg-[var(--neutral-800)] text-white"
                          : "text-[var(--neutral-600)] hover:text-[var(--neutral-900)] hover:bg-sidebar-accent"
                      }`}
                    >
                      {subItem.icon && (
                        <subItem.icon className="w-4 h-4 mr-2" />
                      )}
                      <span className="flex-1">{subItem.title}</span>
                      {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                    </SidebarMenuSubButton>
                  )}
                </Link>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function SidebarMenuCollapsedDropdown({ item }: { item: NavCollapsible }) {
  const routerState = useRouterState();
  const hasActiveChild = item.items.some(
    (subItem) => routerState.location.pathname === subItem.url,
  );

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            className={
              hasActiveChild ? "bg-[var(--neutral-800)] text-white" : ""
            }
          >
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={4}>
          <DropdownMenuLabel>
            {item.title} {item.badge ? `(${item.badge})` : ""}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {item.items.map((sub) => (
            <DropdownMenuItem key={`${sub.title}-${sub.url}`} asChild>
              <Link to={sub.url} activeOptions={{ exact: true }}>
                {({ isActive }) => (
                  <div
                    className={`flex items-center w-full ${isActive ? "bg-secondary" : ""}`}
                  >
                    {sub.icon && <sub.icon />}
                    <span className="max-w-52 text-wrap">{sub.title}</span>
                    {sub.badge && (
                      <span className="ms-auto text-xs">{sub.badge}</span>
                    )}
                  </div>
                )}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
