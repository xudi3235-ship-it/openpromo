/**
 * Zustand store for live WebSocket state.
 *
 * Architecture: Separate data sources for live vs completed runs
 * - LIVE runs (status: "running"): Data comes from WebSocket via this Zustand store
 * - COMPLETED runs: Data comes from React Query (database)
 *
 * This separation ensures reliable real-time updates because:
 * 1. Zustand's set() triggers immediate re-renders
 * 2. Selector subscriptions are efficient (only re-render when specific data changes)
 * 3. No cache key matching issues like with React Query's setQueryData
 */
import type { VideoGenRealtime } from "@shared";
import { create } from "zustand";

export type LiveRunData = {
  runId: string;
  status: VideoGenRealtime.RunStatus;
  logs: string[];
  artifacts: VideoGenRealtime.ServerAppState["artifacts"];
  input: VideoGenRealtime.Input;
  output: VideoGenRealtime.AgentOutput;
  error: string | null;
};

type LiveRunState = {
  // Connection state
  isConnected: boolean;

  // Active run state - ONLY for running jobs
  activeRun: LiveRunData | null;

  // Actions
  setConnected: (connected: boolean) => void;
  syncState: (state: VideoGenRealtime.ServerAppState) => void;
  clearActiveRun: () => void;
};

export const useLiveRunStore = create<LiveRunState>()((set) => ({
  isConnected: false,
  activeRun: null,

  setConnected: (isConnected) => set({ isConnected }),

  syncState: (state) => {
    // Only store RUNNING jobs in Zustand
    // Completed jobs come from React Query (database)
    if (state.status === "running" && state.runId) {
      set({
        activeRun: {
          runId: state.runId,
          status: state.status,
          logs: state.logs,
          artifacts: state.artifacts,
          input: state.input,
          output: state.output,
          error: state.error,
        },
      });
    } else if (state.status === "not_started" || !state.runId) {
      // DO is idle, no active run
      set({ activeRun: null });
    }
    // Ignore sync_state for succeeded/failed - those come via run_completed + query invalidation
  },

  clearActiveRun: () => set({ activeRun: null }),
}));

// ============================================
// Selector hooks for ergonomic consumption
// ============================================

/** Get the active run ID (if any run is currently live) */
export const useActiveRunId = () =>
  useLiveRunStore((s) => s.activeRun?.runId ?? null);

/** Check if a specific run is currently live */
export const useIsRunLive = (runId: string | undefined) =>
  useLiveRunStore((s) => (runId ? s.activeRun?.runId === runId : false));

/** Get live logs (returns empty array if no active run) */
export const useLiveLogs = () =>
  useLiveRunStore((s) => s.activeRun?.logs ?? []);

/** Get live artifacts (returns default empty artifacts if no active run) */
export const useLiveArtifacts = () =>
  useLiveRunStore((s) => s.activeRun?.artifacts ?? { images: [], videos: [] });

/** Get live run status */
export const useLiveStatus = () =>
  useLiveRunStore((s) => s.activeRun?.status ?? "not_started");

/** Get the full active run data */
export const useActiveRun = () => useLiveRunStore((s) => s.activeRun);

/** Get connection status */
export const useIsConnected = () => useLiveRunStore((s) => s.isConnected);
