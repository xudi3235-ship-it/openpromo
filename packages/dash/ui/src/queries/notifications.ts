import type { WorkspaceNotificationEnvelope } from "@shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { convertHonoQueryOptions } from "@/lib/hono-client";
import { QUERY_KEYS } from "@/lib/query";

export type WorkspaceNotificationsResponse = {
  notifications: WorkspaceNotificationEnvelope[];
};

const notificationsQueryOptions = (workspaceSlug: string) =>
  convertHonoQueryOptions<WorkspaceNotificationsResponse>({
    queryKey: QUERY_KEYS.WORKSPACE_NOTIFICATIONS(workspaceSlug),
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].notifications.$get({
        param: { workspaceSlug },
      }),
    staleTime: 5_000,
  });

export const useWorkspaceNotificationsQuery = (
  workspaceSlug: string | undefined,
) => {
  const slug = workspaceSlug ?? "__noop__";
  const options = notificationsQueryOptions(slug);

  return useQuery<WorkspaceNotificationsResponse>({
    ...options,
    enabled: Boolean(workspaceSlug),
  });
};

export const useInvalidateWorkspaceNotifications = (
  workspaceSlug: string | undefined,
) => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    if (!workspaceSlug) return Promise.resolve();
    return queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.WORKSPACE_NOTIFICATIONS(workspaceSlug),
    });
  }, [queryClient, workspaceSlug]);
};
