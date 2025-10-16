import { Badge } from "@openpromo/ui/components/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@openpromo/ui/components/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
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
} from "@openpromo/ui/components/sidebar";
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type {
  NavCollapsible,
  NavGroup as NavGroupProps,
  NavItem,
  NavLink,
} from "./types";
import { WorkspaceNotificationBell } from "./workspace-notification-bell";

interface NavGroupComponentProps extends NavGroupProps {
  workspaceSlug?: string;
}

export function NavGroup({
  title,
  items,
  workspaceSlug,
}: NavGroupComponentProps) {
  const { state, isMobile } = useSidebar();
  const href = useLocation({ select: (location) => location.href });
  const renderedItems = items
    .map((item) => {
      if (item.kind === "notification") {
        if (!workspaceSlug) {
          return null;
        }
        return (
          <SidebarMenuItem key={`${item.title}-notification`}>
            <WorkspaceNotificationBell
              workspaceSlug={workspaceSlug}
              renderTrigger={({ hasUnread, unreadCount, open }) => (
                <SidebarMenuButton
                  type="button"
                  data-state={open ? "open" : "closed"}
                  tooltip={item.title}
                  aria-haspopup="dialog"
                  aria-expanded={open}
                  className="justify-start"
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  {hasUnread && (
                    <NavBadge>{unreadCount > 9 ? "9+" : unreadCount}</NavBadge>
                  )}
                </SidebarMenuButton>
              )}
            />
          </SidebarMenuItem>
        );
      }

      if (!("items" in item) || !item.items) {
        return (
          <SidebarMenuLink
            key={`${item.title}-${"url" in item ? item.url : "link"}`}
            item={item as NavLink}
            href={href}
          />
        );
      }

      if (state === "collapsed" && !isMobile)
        return (
          <SidebarMenuCollapsedDropdown
            key={`${item.title}-collapsible`}
            item={item}
            href={href}
          />
        );

      return (
        <SidebarMenuCollapsible
          key={`${item.title}-collapsible`}
          item={item}
          href={href}
        />
      );
    })
    .filter(Boolean) as ReactNode[];

  if (renderedItems.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>{renderedItems}</SidebarMenu>
    </SidebarGroup>
  );
}

function NavBadge({ children }: { children: ReactNode }) {
  return <Badge className="rounded-full px-1 py-0 text-xs">{children}</Badge>;
}

function SidebarMenuLink({ item, href }: { item: NavLink; href: string }) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={checkIsActive(href, item)}
        tooltip={item.title}
      >
        <Link to={item.url} onClick={() => setOpenMobile(false)}>
          {item.icon && <item.icon />}
          <span>{item.title}</span>
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
      defaultOpen={checkIsActive(href, item)}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="CollapsibleContent">
          <SidebarMenuSub>
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={checkIsActive(href, subItem)}
                >
                  <Link to={subItem.url} onClick={() => setOpenMobile(false)}>
                    {subItem.icon && <subItem.icon />}
                    <span>{subItem.title}</span>
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

function checkIsActive(href: string, item: NavItem) {
  const subPath = href.split("?")[0].split("/").slice(3).pop();

  if ("items" in item && item.items) {
    return item.items.some((subItem) => {
      const subItemPath = subItem.url?.split("?")[0].split("/").slice(3).pop();
      return subPath === subItemPath;
    });
  }

  if (!("url" in item) || !item.url) {
    return false;
  }

  const itemSubPath = item.url.split("?")[0].split("/").slice(3).pop();
  return subPath === itemSubPath;
}
