/**
 * Example usage of the type-safe useWorkspaceEvents hook
 *
 * This file demonstrates various patterns for handling workspace events
 * with full type safety.
 */

import type { WorkspaceEvent } from "@shared/workspace";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useWorkspaceEvents } from "@/hooks/useWorkspaceEvents";

/**
 * Example 1: Basic usage with inline handlers
 */
export function ImageGenerationMonitor() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  useWorkspaceEvents(workspace.slug, {
    handlers: {
      // ✅ Fully typed - TypeScript knows this is ImageGenerationUpdatedEvent
      "image_generation.updated": (event) => {
        // event.generationId: string
        // event.state: "not_started" | "pending" | "generating" | "completed" | "failed"
        // event.stateMessage: string | null | undefined
        // event.outputImages: string[] | undefined

        if (event.state === "completed") {
          toast.success("Image generation complete!");
          queryClient.invalidateQueries({
            queryKey: ["image-generation", event.generationId],
          });
        } else if (event.state === "failed") {
          toast.error(event.stateMessage || "Image generation failed");
        }
      },
    },
  });

  return <div>Monitoring image generations...</div>;
}

/**
 * Example 2: Multiple event handlers
 */
export function InboxMonitor() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  useWorkspaceEvents(workspace.slug, {
    handlers: {
      // ✅ Fully typed - InboxConversationUpsertedEvent
      "inbox.conversation.upserted": (event) => {
        queryClient.invalidateQueries({
          queryKey: ["inbox", "conversations"],
        });
        toast.info(`New conversation: ${event.conversationId}`);
      },

      // ✅ Fully typed - InboxMessageUpsertedEvent
      "inbox.message.upserted": (event) => {
        queryClient.invalidateQueries({
          queryKey: ["inbox", "messages", event.conversationId],
        });

        // Check if message is from user based on sender field
        if (event.message.sender === "user") {
          toast.info(`New message in ${event.conversationId}`);
        }
      },
    },
  });

  return <div>Monitoring inbox...</div>;
}

/**
 * Example 3: Conditional event handling with enabled flag
 */
export function ConditionalMonitor() {
  const { workspace } = useWorkspace();
  const [isMonitoring, setIsMonitoring] = useState(true);

  const { status } = useWorkspaceEvents(workspace.slug, {
    enabled: isMonitoring, // Control when events are handled
    handlers: {
      "image_generation.updated": (event) => {
        // Handle event - event is fully typed
        void event;
      },
    },
  });

  return (
    <div>
      <p>WebSocket status: {status}</p>
      <button type="button" onClick={() => setIsMonitoring(!isMonitoring)}>
        {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
      </button>
    </div>
  );
}

/**
 * Example 4: Using extracted handler functions for reusability
 */
function handleImageGenerationUpdate(
  event: Extract<WorkspaceEvent, { type: "image_generation.updated" }>,
) {
  // Type is automatically inferred as ImageGenerationUpdatedEvent
  // Handle the event - event is fully typed
  void event;
}

function handleConversationUpsert(
  event: Extract<WorkspaceEvent, { type: "inbox.conversation.upserted" }>,
) {
  // Type is automatically inferred as InboxConversationUpsertedEvent
  // Handle the event - event is fully typed
  void event;
}

export function MonitorWithExtractedHandlers() {
  const { workspace } = useWorkspace();

  useWorkspaceEvents(workspace.slug, {
    handlers: {
      "image_generation.updated": handleImageGenerationUpdate,
      "inbox.conversation.upserted": handleConversationUpsert,
    },
  });

  return <div>Monitoring with extracted handlers...</div>;
}

/**
 * Example 5: Integration in a larger component
 */
export function StyleGenerationsPage() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  // Listen for image generation updates and refresh the UI
  useWorkspaceEvents(workspace.slug, {
    handlers: {
      "image_generation.updated": (event) => {
        // Invalidate queries when generations complete
        if (event.state === "completed" || event.state === "failed") {
          queryClient.invalidateQueries({
            queryKey: ["style-generations"],
          });
        }
      },
    },
  });

  return (
    <div>
      {/* Your component UI */}
      <h1>Style Generations</h1>
      {/* ... rest of the component */}
    </div>
  );
}
