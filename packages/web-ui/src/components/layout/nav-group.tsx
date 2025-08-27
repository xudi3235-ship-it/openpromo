import { Link, useLocation } from "@tanstack/react-router";
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
  NavItem,
  NavLink,
} from "./types";

export function NavGroup({ title, items }: NavGroupProps) {
  const { state, isMobile } = useSidebar();
  const href = useLocation({ select: (location) => location.href });
  return (
    <SidebarGroup className="mb-6">
      <SidebarGroupLabel className="text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wider mb-3">
        {title}
      </SidebarGroupLabel>
      <SidebarMenu className="space-y-1">
        {items.map((item) => {
          const key = `${item.title}-${item.url}`;

          if (!item.items)
            return <SidebarMenuLink key={key} item={item} href={href} />;

          if (state === "collapsed" && !isMobile)
            return (
              <SidebarMenuCollapsedDropdown key={key} item={item} href={href} />
            );

          return <SidebarMenuCollapsible key={key} item={item} href={href} />;
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

function SidebarMenuLink({ item, href }: { item: NavLink; href: string }) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={checkIsActive(href, item)}
        tooltip={item.title}
        className="h-10 px-3 font-medium text-[var(--neutral-700)] hover:bg-sidebar-accent hover:text-[var(--neutral-900)] data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground transition-all duration-200 rounded-lg"
      >
        <Link to={item.url} onClick={() => setOpenMobile(false)}>
          {item.icon && <item.icon className="w-5 h-5 mr-3" />}
          <span className="flex-1">{item.title}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarMenuCollapsible({
  item,
  href,
}: {
  item: NavCollapsible;
  href: string;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <Collapsible
      asChild
      defaultOpen={checkIsActive(href, item, true)}
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
                <SidebarMenuSubButton
                  asChild
                  isActive={checkIsActive(href, subItem)}
                  className="text-[var(--neutral-600)] hover:text-[var(--neutral-900)] hover:bg-sidebar-accent transition-all duration-200"
                >
                  <Link to={subItem.url} onClick={() => setOpenMobile(false)}>
                    {subItem.icon && <subItem.icon className="w-4 h-4 mr-2" />}
                    <span className="flex-1">{subItem.title}</span>
                    {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function SidebarMenuCollapsedDropdown({
  item,
  href,
}: {
  item: NavCollapsible;
  href: string;
}) {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={checkIsActive(href, item)}
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
              <Link
                to={sub.url}
                className={`${checkIsActive(href, sub) ? "bg-secondary" : ""}`}
              >
                {sub.icon && <sub.icon />}
                <span className="max-w-52 text-wrap">{sub.title}</span>
                {sub.badge && (
                  <span className="ms-auto text-xs">{sub.badge}</span>
                )}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

function checkIsActive(href: string, item: NavItem, mainNav = false) {
  return (
    href === item.url || // /endpint?search=param
    href.split("?")[0] === item.url || // endpoint
    !!item?.items?.filter((i) => i.url === href).length || // if child nav is active
    (mainNav &&
      href.split("/")[1] !== "" &&
      href.split("/")[1] === item?.url?.split("/")[1])
  );
}
