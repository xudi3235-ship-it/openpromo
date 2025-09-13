import {
  AudioWaveform,
  Calendar,
  Command,
  GalleryVerticalEnd,
  Home,
  Inbox,
  LayoutList,
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
  teams: [
    {
      name: "Your Mom",
      logo: Command,
      plan: "for real",
    },
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
  ],
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
      ],
    },
  ],
};
