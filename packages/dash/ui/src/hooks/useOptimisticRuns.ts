import type { VideoGenRealtime } from "@shared/agents/video-gen-types";
import { useEffect, useMemo, useState } from "react";
import type { RunFeedItem } from "@/features/instant-ad/instant-ad-types";

export function useOptimisticRuns(
  serverRuns: RunFeedItem[] | undefined,
  serverState: VideoGenRealtime.ServerAppState,
  workspaceId: string,
) {
  const [optimisticRuns, setOptimisticRuns] = useState<
    Map<string, RunFeedItem>
  >(new Map());

  // Track optimistic runs from WebSocket sync_state
  useEffect(() => {
    if (!serverState.runId) return;

    const optimisticRun: RunFeedItem = {
      id: serverState.runId,
      status: serverState.status,
      input: serverState.input,
      output: serverState.output,
      artifacts: serverState.artifacts,
      logs: serverState.logs,
      error: serverState.error,
      createdAt: new Date(serverState.lastUpdated),
      updatedAt: new Date(serverState.lastUpdated),
      workspaceId,
      startedAt: null,
      completedAt:
        serverState.status === "succeeded" || serverState.status === "failed"
          ? new Date(serverState.lastUpdated)
          : null,
    };

    setOptimisticRuns((prev) => {
      const next = new Map(prev);
      next.set(serverState.runId as string, optimisticRun);
      return next;
    });
  }, [serverState, workspaceId]);

  // Clean up optimistic runs when confirmed on server
  useEffect(() => {
    if (!serverRuns?.length) return;
    const serverRunIds = new Set(serverRuns.map((r) => r.id));

    setOptimisticRuns((prev) => {
      const next = new Map(prev);
      let hasChanges = false;

      for (const [id] of next) {
        // Remove optimistic runs that are now on server
        if (serverRunIds.has(id)) {
          next.delete(id);
          hasChanges = true;
        }
      }

      return hasChanges ? next : prev;
    });
  }, [serverRuns]);

  // Merge optimistic with server data
  const mergedRuns = useMemo(() => {
    const runs = serverRuns ?? [];
    const optimisticValues = Array.from(optimisticRuns.values());

    // Runs that exist on server take precedence
    const serverIds = new Set(runs.map((r) => r.id));
    const pendingOptimistic = optimisticValues.filter(
      (r) => !serverIds.has(r.id),
    );

    // Pending optimistic first, then server runs
    return [...pendingOptimistic, ...runs];
  }, [serverRuns, optimisticRuns]);

  return mergedRuns;
}
