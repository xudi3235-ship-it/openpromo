import type { WorkspaceNotificationEnvelope } from "@shared";
import { WorkspaceNotificationEnvelopeSchema } from "@shared/workspace/notifications";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { honoApiCall } from "@/lib/hono-client";
import {
  useInvalidateWorkspaceNotifications,
  useWorkspaceNotificationsQuery,
} from "@/queries/notifications";
import { useNotificationToast } from "./useNotificationToast";

export type GenericEvent = {
  type: string;
  message?: unknown;
  timestamp: number;
  [key: string]: unknown;
};

type ConnectionStatus = "connecting" | "open" | "closing" | "closed" | "error";

type UseWorkspaceNotificationsOptions = {
  autoToast?: boolean;
  onNotification?: (notification: WorkspaceNotificationEnvelope) => void;
  onEvent?: (event: GenericEvent) => void;
};

type UseWorkspaceNotificationsResult = {
  status: ConnectionStatus;
  events: GenericEvent[];
  notifications: WorkspaceNotificationEnvelope[];
  sendJson: (payload: unknown) => boolean;
  clearEvents: () => void;
  clearNotifications: () => Promise<boolean>;
  refreshNotifications: () => Promise<void>;
  isLoading: boolean;
  isFetching: boolean;
};

export function useWorkspaceNotifications(
  workspaceSlug: string | undefined,
  options: UseWorkspaceNotificationsOptions = {},
): UseWorkspaceNotificationsResult {
  const { autoToast = true, onNotification, onEvent } = options;

  const socketRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [events, setEvents] = useState<GenericEvent[]>([]);
  const [notifications, setNotifications] = useState<
    WorkspaceNotificationEnvelope[]
  >([]);
  const showNotificationToast = useNotificationToast();
  const notificationsQuery = useWorkspaceNotificationsQuery(workspaceSlug);
  const {
    data,
    refetch,
    isLoading: queryLoading,
    isFetching,
  } = notificationsQuery;
  const invalidateNotifications =
    useInvalidateWorkspaceNotifications(workspaceSlug);

  useEffect(() => {
    if (!workspaceSlug) {
      setNotifications([]);
      return;
    }

    setNotifications(data?.notifications ?? []);
  }, [workspaceSlug, data]);

  const addEvent = useCallback(
    (event: GenericEvent) => {
      setEvents((prev) => [...prev, event]);
      onEvent?.(event);
    },
    [onEvent],
  );

  const clearLocalState = useCallback(() => {
    setEvents([]);
    setNotifications([]);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!workspaceSlug) return;

    setStatus("connecting");
    const socket = new WebSocket(`/api/workspaces/${workspaceSlug}/pusher`);
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus("open");
    };

    socket.onclose = () => {
      setStatus("closed");
    };

    socket.onerror = () => {
      setStatus("error");
    };

    socket.onmessage = (event) => {
      const receivedAt = Date.now();
      try {
        const parsed = JSON.parse(event.data) as unknown;
        const notificationResult =
          WorkspaceNotificationEnvelopeSchema.safeParse(parsed);

        if (notificationResult.success) {
          const normalized: WorkspaceNotificationEnvelope = {
            ...notificationResult.data,
            timestamp: notificationResult.data.timestamp ?? receivedAt,
          };

          void invalidateNotifications();

          if (autoToast) {
            showNotificationToast(normalized.notification);
          }

          onNotification?.(normalized);

          addEvent({
            ...normalized,
            timestamp: normalized.timestamp,
          });
          return;
        }

        if (parsed && typeof parsed === "object") {
          const record = parsed as Record<string, unknown>;
          const genericEvent: GenericEvent = {
            ...record,
            type: typeof record.type === "string" ? record.type : "unknown",
            message: record.message,
            timestamp:
              typeof record.timestamp === "number"
                ? record.timestamp
                : receivedAt,
          };
          addEvent(genericEvent);
          if (autoToast && typeof genericEvent.message === "string") {
            toast(genericEvent.type, {
              description: genericEvent.message,
            });
          }
          return;
        }
      } catch (_error) {
        // fall through to text event
      }

      const textEvent: GenericEvent = {
        type: "text",
        message: event.data,
        timestamp: receivedAt,
      };
      addEvent(textEvent);
      if (autoToast && typeof textEvent.message === "string") {
        toast(textEvent.type, {
          description: textEvent.message,
        });
      }
    };

    return () => {
      setStatus("closing");
      socket.close();
      socketRef.current = null;
    };
  }, [
    workspaceSlug,
    addEvent,
    autoToast,
    onNotification,
    showNotificationToast,
    invalidateNotifications,
  ]);

  const sendJson = useCallback((payload: unknown) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket is not open. Unable to send payload.");
      return false;
    }

    try {
      socket.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error("Failed to send payload over WebSocket", error);
      return false;
    }
  }, []);

  const clearEvents = useCallback(() => {
    clearLocalState();
  }, [clearLocalState]);

  const clearNotifications = useCallback(async () => {
    if (!workspaceSlug) {
      clearLocalState();
      return true;
    }

    const result = await honoApiCall<{ cleared: boolean }>(
      (api) =>
        api.workspaces[":workspaceSlug"].notifications.$delete({
          param: { workspaceSlug },
        }),
      { errorMessage: "Failed to clear notifications" },
    );

    if (!result.success) {
      return false;
    }

    clearLocalState();
    await invalidateNotifications();
    return true;
  }, [workspaceSlug, clearLocalState, invalidateNotifications]);

  const refreshNotifications = useCallback(async () => {
    if (!workspaceSlug) return;
    await refetch();
  }, [workspaceSlug, refetch]);

  return useMemo(
    () => ({
      status,
      events,
      notifications,
      sendJson,
      clearEvents,
      clearNotifications,
      refreshNotifications,
      isLoading: queryLoading,
      isFetching,
    }),
    [
      status,
      events,
      notifications,
      sendJson,
      clearEvents,
      clearNotifications,
      refreshNotifications,
      queryLoading,
      isFetching,
    ],
  );
}
