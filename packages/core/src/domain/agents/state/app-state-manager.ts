import { VideoGenRealtime } from "@shared/agents";
import { produce } from "immer";
import { EntAgentRun } from "../../agent-run";

/**
 * Manages application state for the video generation agent.
 *
 * Handles state updates, persistence, broadcasting, and run lifecycle management.
 */
export class AppStateManager {
  private currentState: VideoGenRealtime.ServerAppState;

  constructor(
    private onBroadcast: (state: VideoGenRealtime.ServerAppState) => void,
    private onSetState: (state: VideoGenRealtime.ServerAppState) => void,
    initialState: VideoGenRealtime.ServerAppState,
  ) {
    this.currentState = initialState;
  }

  /**
   * Get the current state
   */
  get state(): VideoGenRealtime.ServerAppState {
    return this.currentState;
  }

  /**
   * Patch the application state with partial updates.
   * Automatically updates lastUpdated timestamp and persists to database.
   */
  patchState(updater: (draft: VideoGenRealtime.ServerAppState) => void): void {
    const newState = produce(this.currentState, (draft) => {
      updater(draft);
      draft.lastUpdated = new Date().toISOString();
    });

    this.currentState = newState;
    this.onSetState(newState);

    if (!this.currentState.runId) return;

    // Persist state asynchronously
    EntAgentRun.fromID(this.currentState.runId)
      .then((run) => {
        run.persistState(newState);
      })
      .catch((err) => {
        // might be deleted
        console.error(
          `[AppStateManager] Failed to persist state for run ${this.currentState.runId}:`,
          err,
        );
      });
  }

  /**
   * Reset state to initial values and broadcast.
   */
  resetState(
    initialState: VideoGenRealtime.ServerAppState,
    onReset?: () => void,
  ): void {
    this.currentState = initialState;
    this.onSetState(initialState);
    if (onReset) onReset();
    this.onBroadcast(this.currentState);
  }

  /**
   * Broadcast current state to all connections.
   */
  broadcastState(): void {
    this.onBroadcast(this.currentState);
  }

  /**
   * Validate input before starting a run.
   */
  validateInput(input: VideoGenRealtime.Input): {
    valid: boolean;
    error?: string;
  } {
    if (input.productImages.length === 0) {
      return {
        valid: false,
        error: "No product images provided in input.",
      };
    }
    if (input.prompt.length === 0) {
      return {
        valid: false,
        error: "No prompt provided in input.",
      };
    }
    return { valid: true };
  }

  /**
   * Manage state lifecycle for a run execution.
   * Handles validation, run creation, status transitions, and error handling.
   */
  async withRunLifecycle<T>(
    input: VideoGenRealtime.Input,
    onResetInternal: () => void,
    fn: () => Promise<T>,
  ): Promise<T | undefined> {
    // Check if already running
    if (this.currentState.status === "running") {
      console.warn(
        "[AppStateManager] withRunLifecycle called but already running",
      );
      return;
    }

    // Validate input
    const validation = this.validateInput(input);
    if (!validation.valid) {
      console.error(`[AppStateManager] Invalid input: ${validation.error}`);
      this.patchState((draft) => {
        draft.status = "failed";
        draft.error = validation.error ?? "Invalid input";
      });
      return;
    }

    // Reset internal state before starting
    onResetInternal();

    // Create run and mark as running
    const run = await EntAgentRun.createFromState(this.currentState);
    this.patchState((draft) => {
      draft.status = "running";
      draft.runId = run.data.id;
    });

    try {
      // Execute the run
      const result = await fn();

      // Mark as succeeded
      this.patchState((draft) => {
        draft.status = "succeeded";
      });

      return result;
    } catch (error) {
      // Mark as failed
      this.patchState((draft) => {
        draft.status = "failed";
        draft.error =
          typeof error === "string" ? error : (error as Error).message;
      });
      throw error;
    } finally {
      // Reset state after run
      console.log(`[AppStateManager] resetting state after run`);
      this.resetState(VideoGenRealtime.initialServerAppState, onResetInternal);
    }
  }
}
