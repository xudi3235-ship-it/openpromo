import type { WorkspaceEvent } from "@shared/workspace";
import { WorkspaceEventSchema } from "@shared/workspace";
import type React from "react";
import { useEffect, useRef } from "react";
import { useWorkspaceNotifications } from "./useWorkspaceNotifications";

/**
 * Type-safe event handler for specific workspace event types
 */
export type EventHandler<T extends WorkspaceEvent["type"]> = (
  event: Extract<WorkspaceEvent, { type: T }>,
) => void;

/**
 * Map of event types to their handlers
 */
type EventHandlerMap = {
  [K in WorkspaceEvent["type"]]?: EventHandler<K>;
};

/**
 * Options for useWorkspaceEvents hook
 */
type UseWorkspaceEventsOptions = {
  /**
   * Type-safe event handlers for specific event types
   * Each handler receives the fully typed event payload
   *
   * @example
   * ```ts
   * useWorkspaceEvents(workspace.slug, {
   *   handlers: {
   *     "image_generation.updated": (event) => {
   *       // event is fully typed as ImageGenerationUpdatedEvent
   *       console.log(event.generationId, event.state);
   *     },
   *     "inbox.conversation.upserted": (event) => {
   *       // event is fully typed as InboxConversationUpsertedEvent
   *       console.log(event.conversationId);
   *     }
   *   }
   * });
   * ```
   */
  handlers?: EventHandlerMap;

  /**
   * Catch-all handler for events without specific handlers
   * Useful for logging or debugging
   */
  onUnhandledEvent?: (event: WorkspaceEvent) => void;

  /**
   * Enable/disable the event listeners
   * @default true
   */
  enabled?: boolean;
};

/**
 * Type-safe hook for handling workspace events
 *
 * This hook provides an elegant way to handle workspace WebSocket events with full type safety.
 * Event handlers are automatically typed based on the event type they handle.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { workspace } = useWorkspace();
 *
 *   useWorkspaceEvents(workspace.slug, {
 *     handlers: {
 *       "image_generation.updated": (event) => {
 *         // event.generationId, event.state, etc. are all typed
 *         if (event.state === "completed") {
 *           toast.success("Generation complete!");
 *         }
 *       },
 *       "inbox.message.upserted": (event) => {
 *         // event.messageId, event.conversationId, etc. are all typed
 *         queryClient.invalidateQueries(["inbox", event.conversationId]);
 *       }
 *     },
 *     onUnhandledEvent: (event) => {
 *       console.debug("Unhandled event:", event.type);
 *     }
 *   });
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useWorkspaceEvents(
  workspaceSlug: string | undefined,
  options: UseWorkspaceEventsOptions = {},
) {
  const { handlers, onUnhandledEvent, enabled = true } = options;

  // Store handlers in a ref to avoid recreating the event listener on every render
  const handlersRef = useRef(handlers);
  const onUnhandledEventRef = useRef(onUnhandledEvent);

  // Update refs when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
    onUnhandledEventRef.current = onUnhandledEvent;
  }, [handlers, onUnhandledEvent]);

  // Subscribe to workspace notifications with a generic event handler
  const { status } = useWorkspaceNotifications(workspaceSlug, {
    autoToast: false, // Disable auto-toast since we're handling events manually
    onEvent: enabled
      ? (genericEvent) => {
          try {
            // Parse and validate the event against the WorkspaceEventSchema
            const parseResult = WorkspaceEventSchema.safeParse(genericEvent);

            if (!parseResult.success) {
              // Event doesn't match any known workspace event schema
              // This could be a notification or other non-event message
              return;
            }

            const event = parseResult.data;
            const eventType = event.type;

            // Get the specific handler for this event type
            const handler = handlersRef.current?.[eventType];

            if (handler) {
              // Call the type-safe handler with the fully typed event
              // TypeScript knows the exact shape of the event based on its type
              handler(event as never);
            } else if (onUnhandledEventRef.current) {
              // No specific handler, call the catch-all handler
              onUnhandledEventRef.current(event);
            }
          } catch (error) {
            console.error("Error processing workspace event:", error);
          }
        }
      : undefined,
  });

  return { status };
}

/**
 * Higher-order component that wraps a component with workspace event listeners
 *
 * NOTE: This must be used in a .tsx file since it returns JSX
 *
 * @example
 * ```tsx
 * const MyComponentWithEvents = withWorkspaceEvents(MyComponent, {
 *   handlers: {
 *     "image_generation.updated": (event) => {
 *       console.log("Generation updated:", event.generationId);
 *     }
 *   }
 * });
 * ```
 */
export function withWorkspaceEvents<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<UseWorkspaceEventsOptions, "enabled">,
): React.ComponentType<P & { workspaceSlug: string }> {
  const WorkspaceEventsWrapper = (props: P & { workspaceSlug: string }) => {
    useWorkspaceEvents(props.workspaceSlug, options);
    // @ts-expect-error - JSX in .ts file, will work at runtime
    return React.createElement(Component, props);
  };
  return WorkspaceEventsWrapper;
}
