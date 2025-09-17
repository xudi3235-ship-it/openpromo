import {
  Calendar,
  Home,
  Inbox,
  LayoutList,
  Settings,
  SquarePen,
  TrendingUp,
} from "lucide-react";
import type { SidebarData } from "../types";

export const sidebarData: SidebarData = {
  user: {
    name: "satnaing",
    email: "satnaingdev@gmail.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [],
  navGroups: [
    {
      title: "General",
      items: [
        {
          title: "Home",
          url: "/workspaces/$workspaceSlug",
          icon: Home,
        },
        {
          title: "Create Post",
          url: "/workspaces/$workspaceSlug/composer",
          icon: SquarePen,
        },
        {
          title: "Content",
          url: "/workspaces/$workspaceSlug/content",
          icon: LayoutList,
        },
        {
          title: "Calendar",
          url: "/workspaces/$workspaceSlug/calendar",
          icon: Calendar,
        },
        {
          title: "Inbox",
          url: "/workspaces/$workspaceSlug/inbox",
          icon: Inbox,
        },
        {
          title: "Insights",
          url: "/workspaces/$workspaceSlug/insights",
          badge: "3",
          icon: TrendingUp,
        },
        {
          title: "[INTERN]Playground",
          url: "/workspaces/$workspaceSlug/playground",
          icon: Settings,
        },
      ],
    },
  ],
};
