import { SidebarMenuButton } from "@openpromo/ui/components/sidebar";
import { Link } from "@tanstack/react-router";
import type React from "react";
import { useInboxUnreadCount } from "@/queries/inbox/conversations";

type WorkspaceInboxUnreadProps = {
  workspaceSlug: string;
  renderTrigger?: (args: {
    unreadCount: number;
    isLoading: boolean;
  }) => React.ReactElement;
  title?: string;
  url?: string;
  icon?: React.ElementType;
};

export function WorkspaceInboxUnread({
  workspaceSlug,
  renderTrigger,
  title = "Inbox",
  url = "/workspaces/$workspaceSlug/inbox",
  icon: Icon,
}: WorkspaceInboxUnreadProps) {
  const { data, isPending } = useInboxUnreadCount();
  const isLoading = isPending;
  const unreadCount = data?.unreadCount ?? 0;

  const triggerElement = renderTrigger ? (
    renderTrigger({ unreadCount, isLoading })
  ) : (
    <SidebarMenuButton asChild>
      <Link to={url} params={{ workspaceSlug }}>
        {Icon && <Icon />}
        <span>{title}</span>
        {!isLoading && unreadCount > 0 && (
          <span className="ms-auto inline-flex items-center justify-center rounded-full bg-primary px-1.5 py-0 text-[10px] font-medium text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    </SidebarMenuButton>
  );

  return triggerElement;
}
