/**
 * Workspace WebSocket Context Provider
 *
 * Ensures only ONE WebSocket connection per workspace by providing
 * the connection through React Context. All hooks can then share
 * the same connection.
 */

import type {
  WorkspaceEvent,
  WorkspaceNotificationEnvelope,
} from "@shared/workspace";
import { WorkspaceEventSchema } from "@shared/workspace";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { GenericEvent } from "./useWorkspaceNotifications";
import { useWorkspaceNotifications } from "./useWorkspaceNotifications";

type EventListener = (event: WorkspaceEvent) => void;

interface WorkspaceWebSocketContextValue {
  status: "connecting" | "open" | "closing" | "closed" | "error";
  subscribe: (listener: EventListener) => () => void;
  notifications: WorkspaceNotificationEnvelope[];
  clearNotifications: () => Promise<boolean>;
  refreshNotifications: () => Promise<void>;
  isLoading: boolean;
  isFetching: boolean;
}

const WorkspaceWebSocketContext =
  createContext<WorkspaceWebSocketContextValue | null>(null);

interface WorkspaceWebSocketProviderProps {
  workspaceSlug: string;
  children: React.ReactNode;
}

/**
 * Provider that creates and manages a single WebSocket connection
 * for the workspace. All child components can subscribe to events
 * without creating additional connections.
 */
export function WorkspaceWebSocketProvider({
  workspaceSlug,
  children,
}: WorkspaceWebSocketProviderProps) {
  const listenersRef = useRef<Set<EventListener>>(new Set());

  // Stable event handler using useCallback with empty deps
  const handleEvent = useCallback((genericEvent: GenericEvent) => {
    try {
      const eventRecord = genericEvent as Record<string, unknown>;
      console.info("[WS] Received event, attempting to parse:", {
        type: eventRecord?.type,
        hasMessage: !!eventRecord?.message,
      });

      // Try to parse as WorkspaceEvent
      const parseResult = WorkspaceEventSchema.safeParse(genericEvent);

      if (parseResult.success) {
        console.info("[WS] Event parsed successfully:", parseResult.data.type);
        const event = parseResult.data;
        // Notify all subscribed listeners
        for (const listener of listenersRef.current) {
          try {
            listener(event);
          } catch (error) {
            console.error("Error in workspace event listener:", error);
          }
        }
      } else {
        console.error("[WS] Event parse FAILED:", {
          eventType: eventRecord?.type,
          issues: parseResult.error.issues,
        });
        console.error(
          "[WS] Raw event that failed to parse:",
          JSON.stringify(genericEvent, null, 2),
        );
      }
    } catch (error) {
      console.error("Error processing workspace event:", error);
      console.error("Stack:", error instanceof Error ? error.stack : null);
    }
  }, []); // Empty deps - listenersRef.current is always up to date

  // Single WebSocket connection for the entire workspace
  const {
    status,
    notifications,
    clearNotifications,
    refreshNotifications,
    isLoading,
    isFetching,
  } = useWorkspaceNotifications(workspaceSlug, {
    autoToast: true, // Show notifications automatically
    onEvent: handleEvent,
  });

  const subscribe = useCallback((listener: EventListener) => {
    listenersRef.current.add(listener);

    // Return unsubscribe function
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []); // Empty deps - this function never changes

  const contextValue = useMemo(
    () => ({
      status,
      subscribe,
      notifications,
      clearNotifications,
      refreshNotifications,
      isLoading,
      isFetching,
    }),
    [
      status,
      subscribe,
      notifications,
      clearNotifications,
      refreshNotifications,
      isLoading,
      isFetching,
    ],
  );

  return (
    <WorkspaceWebSocketContext.Provider value={contextValue}>
      {children}
    </WorkspaceWebSocketContext.Provider>
  );
}

/**
 * Hook to access the workspace WebSocket connection
 * and subscribe to events.
 *
 * @throws Error if used outside of WorkspaceWebSocketProvider
 */
export function useWorkspaceWebSocket() {
  const context = useContext(WorkspaceWebSocketContext);

  if (!context) {
    throw new Error(
      "useWorkspaceWebSocket must be used within WorkspaceWebSocketProvider",
    );
  }

  return context;
}

/**
 * Type-safe hook for handling workspace events
 *
 * Subscribes to real-time workspace events via WebSocket. Uses a shared connection
 * managed by WorkspaceWebSocketProvider to avoid duplicate connections.
 *
 * @example
 * ```tsx
 * useWorkspaceEvents({
 *   handlers: {
 *     "style_component.updated": (event) => {
 *       console.log("Style updated:", event.styleId);
 *     },
 *     "image_generation.updated": (event) => {
 *       console.log("Image generation:", event.state);
 *     }
 *   }
 * });
 * ```
 */
export function useWorkspaceEvents(options: {
  handlers?: {
    [K in WorkspaceEvent["type"]]?: (
      event: Extract<WorkspaceEvent, { type: K }>,
    ) => void;
  };
  onUnhandledEvent?: (event: WorkspaceEvent) => void;
  enabled?: boolean;
}) {
  const { handlers, onUnhandledEvent, enabled = true } = options;
  const { status, subscribe } = useWorkspaceWebSocket();

  // Store handlers in a ref to avoid recreating the subscription
  const handlersRef = useRef(handlers);
  const onUnhandledEventRef = useRef(onUnhandledEvent);

  useEffect(() => {
    handlersRef.current = handlers;
    onUnhandledEventRef.current = onUnhandledEvent;
  }, [handlers, onUnhandledEvent]);

  useEffect(() => {
    if (!enabled) return;

    const handleEvent = (event: WorkspaceEvent) => {
      const eventType = event.type;
      const handler = handlersRef.current?.[eventType];

      if (handler) {
        // Call the type-safe handler
        handler(event as never);
      } else if (onUnhandledEventRef.current) {
        onUnhandledEventRef.current(event);
      }
    };

    // Subscribe to events
    const unsubscribe = subscribe(handleEvent);

    return () => {
      unsubscribe();
    };
  }, [subscribe, enabled]);

  return { status };
}
