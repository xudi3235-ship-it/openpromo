import type { LinkProps } from "@tanstack/react-router";

type BaseNavItem = {
  title: string;
  badge?: string;
  icon?: React.ElementType;
};

type NavLink = BaseNavItem & {
  url: LinkProps["to"] | (string & {});
  items?: never;
  kind?: "link";
};

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: LinkProps["to"] | (string & {}) })[];
  url?: never;
  kind?: "collapsible";
};

type NavNotification = BaseNavItem & {
  kind: "notification";
  url?: never;
  items?: never;
};

type NavItem = NavCollapsible | NavLink | NavNotification;

type NavGroup = {
  title: string;
  items: NavItem[];
};

type SidebarData = {
  navGroups: NavGroup[];
};

export type {
  NavCollapsible,
  NavGroup,
  NavItem,
  NavLink,
  NavNotification,
  SidebarData,
};
