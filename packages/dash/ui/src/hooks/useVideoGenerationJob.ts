import type { VideoGenerationUpdatedEvent } from "@shared/workspace";
import { WorkspaceEventType } from "@shared/workspace";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspaceEvents } from "./useWorkspaceEvents";

export type VideoGenerationStateName =
  | VideoGenerationUpdatedEvent["state"]
  | "not_started";

export type VideoGenerationState = {
  state: VideoGenerationStateName;
  message?: string;
  outputUrl?: string;
};

export function useVideoGenerationJob(workspaceSlug: string | undefined) {
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(
    null,
  );
  const [generationState, setGenerationState] =
    useState<VideoGenerationState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  const isProcessing = useMemo(() => {
    if (!generationState) return false;
    return (
      generationState.state === "processing" ||
      generationState.state === "not_started"
    );
  }, [generationState]);

  const handleVideoGenEvent = useCallback(
    (event: VideoGenerationUpdatedEvent) => {
      if (event.jobId !== activeGenerationId) return;

      setGenerationState({
        state: event.state,
        message: event.message,
        outputUrl: event.outputUrl,
      });
    },
    [activeGenerationId],
  );

  useWorkspaceEvents(workspaceSlug, {
    handlers: {
      [WorkspaceEventType.VideoGenerationUpdated]: handleVideoGenEvent,
    },
    enabled: Boolean(activeGenerationId),
  });

  useEffect(() => {
    if (!isProcessing) return;

    const startTime = startTimeRef.current;
    if (!startTime) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isProcessing]);

  const startJob = useCallback((generationId: string) => {
    setActiveGenerationId(generationId);
    setGenerationState({ state: "not_started" });
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
  }, []);

  const resetJobState = useCallback(() => {
    setActiveGenerationId(null);
    setGenerationState(null);
    startTimeRef.current = null;
    setElapsedSeconds(0);
  }, []);

  return {
    activeGenerationId,
    generationState,
    isProcessing,
    elapsedSeconds,
    startJob,
    resetJobState,
    videoUrl: generationState?.outputUrl ?? null,
    summary: generationState?.message ?? null,
    error:
      generationState?.state === "failed"
        ? (generationState.message ?? null)
        : null,
  };
}
