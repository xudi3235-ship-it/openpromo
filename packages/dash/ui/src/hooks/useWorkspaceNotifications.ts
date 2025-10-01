import type {
  WorkspaceNotification,
  WorkspaceNotificationEnvelope,
} from "@core/domain/workspace/notifications";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type GenericEvent = {
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

  const addEvent = useCallback(
    (event: GenericEvent) => {
      setEvents((prev) => [...prev, event]);
      onEvent?.(event);
    },
    [onEvent],
  );

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

        if (isWorkspaceNotificationEnvelope(parsed)) {
          const normalized: WorkspaceNotificationEnvelope = {
            ...parsed,
            timestamp: parsed.timestamp ?? receivedAt,
          };

          setNotifications((prev) => [...prev, normalized]);

          if (autoToast) {
            displayNotificationToast(normalized.notification);
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
  }, [workspaceSlug, addEvent, autoToast, onNotification]);

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
    setEvents([]);
    setNotifications([]);
  }, []);

  return useMemo(
    () => ({
      status,
      events,
      notifications,
      sendJson,
      clearEvents,
    }),
    [status, events, notifications, sendJson, clearEvents],
  );
}

function displayNotificationToast(notification: WorkspaceNotification) {
  if (notification.type === "content.published") {
    const placement = notification.placement.replace(/_/g, " ");
    toast.success("Content Published", {
      description: `Published to ${placement}`,
    });
  }
}

function isWorkspaceNotificationEnvelope(
  value: unknown,
): value is WorkspaceNotificationEnvelope & { timestamp?: number } {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.type !== "notification") return false;
  if (typeof record.workspaceSlug !== "string") return false;
  if (!record.notification || typeof record.notification !== "object") {
    return false;
  }
  return true;
}
