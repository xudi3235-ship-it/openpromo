import {
  Calendar,
  Home,
  Image,
  Inbox,
  LayoutList,
  Package,
  Palette,
  Settings,
  SquarePen,
  TrendingUp,
  Users,
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
      title: "Tools",
      items: [
        {
          title: "Home",
          url: "/workspaces/$workspaceSlug",
          icon: Home,
        },
        {
          title: "Inbox",
          url: "/workspaces/$workspaceSlug/inbox",
          icon: Inbox,
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
          title: "Products",
          url: "/workspaces/$workspaceSlug/products",
          icon: Package,
        },
        {
          title: "Styles",
          url: "/workspaces/$workspaceSlug/styles",
          icon: Palette,
        },
        {
          title: "Calendar",
          url: "/workspaces/$workspaceSlug/calendar",
          icon: Calendar,
        },
        {
          title: "Insights",
          url: "/workspaces/$workspaceSlug/insights",
          badge: "3",
          icon: TrendingUp,
        },
        {
          title: "Team",
          url: "/workspaces/$workspaceSlug/team",
          icon: Users,
        },
      ],
    },
    {
      title: "Labs[Internal]",
      items: [
        {
          title: "Realtime Playground",
          url: "/workspaces/$workspaceSlug/labs/playground",
          icon: Settings,
        },
        {
          title: "Image Gen",
          url: "/workspaces/$workspaceSlug/labs/image-gen",
          icon: Image,
        },
      ],
    },
  ],
};
