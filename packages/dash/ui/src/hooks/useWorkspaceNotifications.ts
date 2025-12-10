import type { WorkspaceNotificationEnvelope } from "@shared";
import type { WorkspaceEvent } from "@shared/workspace";
import { WorkspaceEventSchema } from "@shared/workspace";
import { WorkspaceNotificationEnvelopeSchema } from "@shared/workspace/notifications";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { honoApiCall } from "@/lib/hono-client";
import {
  useInvalidateWorkspaceNotifications,
  useWorkspaceNotificationsQuery,
} from "@/queries/notifications";
import { useNotificationToast } from "./useNotificationToast";

type ConnectionStatus = "connecting" | "open" | "closing" | "closed" | "error";

type MessageListener = (data: unknown) => void;

type UseWorkspaceNotificationsOptions = {
  autoToast?: boolean;
  onNotification?: (notification: WorkspaceNotificationEnvelope) => void;
  onEvent?: (event: WorkspaceEvent) => void;
  onUnparsedMessage?: (data: unknown) => void;
};

type UseWorkspaceNotificationsResult = {
  status: ConnectionStatus;
  notifications: WorkspaceNotificationEnvelope[];
  subscribe: (listener: MessageListener) => () => void;
  sendJson: (payload: unknown) => boolean;
  clearNotifications: () => Promise<boolean>;
  refreshNotifications: () => Promise<void>;
  isLoading: boolean;
  isFetching: boolean;
};

// No reconnection needed - CF Durable Objects handle connection persistence

export function useWorkspaceNotifications(
  workspaceSlug: string | undefined,
  options: UseWorkspaceNotificationsOptions = {},
): UseWorkspaceNotificationsResult {
  const { autoToast = true } = options;

  // Store callbacks in refs to avoid re-triggering the effect
  const onNotificationRef = useRef(options.onNotification);
  const onEventRef = useRef(options.onEvent);
  const onUnparsedMessageRef = useRef(options.onUnparsedMessage);

  // Keep refs up to date
  useEffect(() => {
    onNotificationRef.current = options.onNotification;
    onEventRef.current = options.onEvent;
    onUnparsedMessageRef.current = options.onUnparsedMessage;
  }, [options.onNotification, options.onEvent, options.onUnparsedMessage]);

  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<MessageListener>>(new Set());
  const isIntentionalCloseRef = useRef(false);

  const [status, setStatus] = useState<ConnectionStatus>("closed");
  const [notifications, setNotifications] = useState<
    WorkspaceNotificationEnvelope[]
  >([]);
  const showNotificationToast = useNotificationToast();
  const notificationsQuery = useWorkspaceNotificationsQuery(workspaceSlug);
  const {
    data,
    refetch,
    isPending: queryLoading,
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

  const clearLocalState = useCallback(() => {
    setNotifications([]);
  }, []);

  const connect = useCallback(
    (slug: string) => {
      // Cleanup existing socket
      if (socketRef.current) {
        isIntentionalCloseRef.current = true;
        socketRef.current.close();
        socketRef.current = null;
      }

      setStatus("connecting");

      // CF Durable Objects maintain WebSocket connections through hibernation
      const socket = new WebSocket(`/api/workspaces/${slug}/pusher`);
      socketRef.current = socket;
      isIntentionalCloseRef.current = false;

      socket.onopen = () => {
        console.info("[WS] Connected");
        setStatus("open");
      };

      socket.onclose = (event) => {
        console.info(
          `[WS] Connection closed (code: ${event.code}, reason: ${event.reason || "none"})`,
        );
        setStatus("closed");
        socketRef.current = null;

        // No auto-reconnect - CF DOs handle connection persistence
        // Users can refresh the page if needed
      };

      socket.onerror = (error) => {
        console.error("[WS] Connection error:", error);
        setStatus("error");
      };

      socket.onmessage = (event) => {
        const receivedAt = Date.now();
        let parsed: unknown;

        try {
          parsed = JSON.parse(event.data) as unknown;
        } catch (_error) {
          // Not JSON, treat as raw message
          for (const listener of listenersRef.current) {
            listener(event.data);
          }
          onUnparsedMessageRef.current?.(event.data);
          return;
        }

        // Notify all raw listeners first
        for (const listener of listenersRef.current) {
          listener(parsed);
        }

        // Try to parse as WorkspaceNotificationEnvelope
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

          onNotificationRef.current?.(normalized);
          return;
        }

        // Try to parse as WorkspaceEvent
        const eventResult = WorkspaceEventSchema.safeParse(parsed);

        if (eventResult.success) {
          onEventRef.current?.(eventResult.data);
          return;
        }

        // Unparsed message
        onUnparsedMessageRef.current?.(parsed);
      };
    },
    [autoToast, showNotificationToast, invalidateNotifications],
  );

  // Main connection effect
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!workspaceSlug) {
      setStatus("closed");
      return;
    }

    connect(workspaceSlug);

    return () => {
      // Cleanup
      isIntentionalCloseRef.current = true;

      // Close the socket
      if (socketRef.current) {
        socketRef.current.close(1000, "Component unmounting");
        socketRef.current = null;
      }

      setStatus("closed");
    };
  }, [workspaceSlug, connect]);

  const subscribe = useCallback((listener: MessageListener) => {
    listenersRef.current.add(listener);

    // Return unsubscribe function
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

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

  const clearNotifications = useCallback(async () => {
    if (!workspaceSlug) {
      clearLocalState();
      return true;
    }

    // Optimistically clear the UI immediately
    const previousNotifications = notifications;
    clearLocalState();

    // Call API in the background
    const result = await honoApiCall<{ cleared: boolean }>(
      (api) =>
        api.workspaces[":workspaceSlug"].notifications.$delete({
          param: { workspaceSlug },
        }),
      { errorMessage: "Failed to clear notifications" },
    );

    if (!result.success) {
      // Rollback on failure
      setNotifications(previousNotifications);
      return false;
    }

    await invalidateNotifications();
    return true;
  }, [workspaceSlug, clearLocalState, invalidateNotifications, notifications]);

  const refreshNotifications = useCallback(async () => {
    if (!workspaceSlug) return;
    await refetch();
  }, [workspaceSlug, refetch]);

  return useMemo(
    () => ({
      status,
      notifications,
      subscribe,
      sendJson,
      clearNotifications,
      refreshNotifications,
      isLoading: queryLoading,
      isFetching,
    }),
    [
      status,
      notifications,
      subscribe,
      sendJson,
      clearNotifications,
      refreshNotifications,
      queryLoading,
      isFetching,
    ],
  );
}
