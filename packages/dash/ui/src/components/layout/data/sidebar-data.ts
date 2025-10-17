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
  TestTube,
  TrendingUp,
  Users,
} from "lucide-react";
import { BiNotification } from "react-icons/bi";
import { useActor } from "@/hooks/useActor";
import type { SidebarData } from "../types";

export const useSidebarData = (): SidebarData => {
  const user = useActor();
  const isInternal = user.featureFlags.includes("is_internal");

  const allNavGroups = [
    {
      title: "Core",
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
          title: "Notifications",
          kind: "notification" as const,
          icon: BiNotification,
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
          title: "Insights",
          url: "/workspaces/$workspaceSlug/insights",
          badge: "3",
          icon: TrendingUp,
        },
      ],
    },
    {
      title: "Growth",
      items: [
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
      ],
    },
    {
      title: "Workspace",
      items: [
        {
          title: "Team",
          url: "/workspaces/$workspaceSlug/team",
          icon: Users,
        },
      ],
    },
    ...(isInternal
      ? [
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
              {
                title: "API Testing",
                url: "/workspaces/$workspaceSlug/labs/api-testing",
                icon: TestTube,
              },
            ],
          },
        ]
      : []),
  ];

  return {
    navGroups: allNavGroups,
  };
};
