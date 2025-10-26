import type { WorkspaceNotificationEnvelope } from "@shared/workspace";
import { useMemo } from "react";
import { EmptyNotifications } from "./empty-notifications";
import { NotificationItem } from "./notification-item";
import { NotificationSkeleton } from "./notification-skeleton";

type NotificationListProps = {
  notifications: WorkspaceNotificationEnvelope[];
  workspaceSlug: string;
  isLoading: boolean;
  isFetching: boolean;
};

const MAX_VISIBLE_NOTIFICATIONS = 10;

export function NotificationList({
  notifications,
  workspaceSlug,
  isLoading,
  isFetching,
}: NotificationListProps) {
  const recentNotifications = useMemo(() => {
    return [...notifications].slice(-MAX_VISIBLE_NOTIFICATIONS).reverse();
  }, [notifications]);

  if (isLoading || isFetching) {
    return <NotificationSkeleton />;
  }

  if (recentNotifications.length === 0) {
    return <EmptyNotifications />;
  }

  return (
    <div className="max-h-72 overflow-y-auto">
      <ul className="divide-y">
        {recentNotifications.map((envelope, index) => (
          <NotificationItem
            key={`${envelope.timestamp}-${index}`}
            envelope={envelope}
            workspaceSlug={workspaceSlug}
          />
        ))}
      </ul>
    </div>
  );
}
