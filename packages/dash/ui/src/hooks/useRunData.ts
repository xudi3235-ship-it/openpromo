import type { VideoGenRealtime } from "@shared";
import { useMemo } from "react";
import type { RunFeedItem } from "@/features/instant-ad/instant-ad-types";
import { useAgentRunQuery } from "@/queries/agent-runs";
import {
  type LiveRunData,
  useIsRunLive,
  useLiveRunStore,
} from "@/stores/live-run-store";

export type RunDataResult = {
  /** The run data (either from live WebSocket or database) */
  run: RunFeedItem | LiveRunData | null;
  /** Whether the query is pending (only applicable for database queries) */
  isPending: boolean;
  /** Error from the query (only applicable for database queries) */
  error: Error | null;
  /** Whether this run is currently live (receiving WebSocket updates) */
  isLive: boolean;
  /** Logs for this run */
  logs: string[];
  /** Artifacts for this run */
  artifacts: VideoGenRealtime.ServerAppState["artifacts"];
  /** Run status */
  status: string | undefined;
};

/**
 * Unified hook for run data.
 *
 * This hook implements the "separate data sources" pattern:
 * - LIVE runs (status: "running"): Returns data from Zustand store (WebSocket)
 * - COMPLETED runs: Returns data from React Query (database)
 *
 * This ensures reliable real-time updates because Zustand's set() triggers
 * immediate re-renders, unlike React Query's setQueryData.
 */
export function useRunData(runId: string | undefined): RunDataResult {
  const isLive = useIsRunLive(runId);
  const liveRun = useLiveRunStore((s) => s.activeRun);
  const {
    data: queryRun,
    isPending,
    error,
  } = useAgentRunQuery(
    { id: runId ?? "" },
    { enabled: !!runId && !isLive }, // Skip query if live (we have WebSocket data)
  );

  return useMemo(() => {
    if (isLive && liveRun) {
      // LIVE: Use WebSocket state directly from Zustand
      return {
        run: liveRun,
        isPending: false,
        error: null,
        isLive: true,
        logs: liveRun.logs,
        artifacts: liveRun.artifacts,
        status: liveRun.status,
      };
    }

    // COMPLETED: Use query data from database
    const logs = Array.isArray(queryRun?.logs)
      ? (queryRun.logs as string[])
      : [];
    const artifacts = (queryRun?.artifacts as RunDataResult["artifacts"]) ?? {
      images: [],
      videos: [],
    };

    return {
      run: queryRun ?? null,
      isPending,
      error,
      isLive: false,
      logs,
      artifacts,
      status: queryRun?.status,
    };
  }, [isLive, liveRun, queryRun, isPending, error]);
}
