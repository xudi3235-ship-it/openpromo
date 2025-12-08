/**
 * Agent lifecycle hooks for video generation agent.
 * Provides event-based logging and monitoring.
 *
 * Based on OpenAI Agents SDK hooks pattern.
 */

import type { Agent, RunContext, Tool } from "@openai/agents";
import type { VideoGenRealtime } from "@shared/agents";
import type { VideoGenAgentContext } from "./context";

/**
 * Tool call details for hook events.
 */
interface ToolCallDetails {
  toolCall: {
    id: string;
    type: string;
    function?: {
      name: string;
      arguments: string;
    };
  };
}

/**
 * Setup agent lifecycle hooks for logging and monitoring.
 * Call this after creating the agent to attach event handlers.
 */
export function setupAgentHooks(
  agent: Agent<VideoGenAgentContext, VideoGenRealtime.AgentOutput>,
  options?: {
    /** Custom logger function */
    logger?: (message: string, ...args: unknown[]) => void;
    /** Callback when agent starts */
    onAgentStart?: (
      ctx: RunContext<VideoGenAgentContext>,
      agent: Agent<VideoGenAgentContext, VideoGenRealtime.AgentOutput>,
    ) => void;
    /** Callback when agent ends */
    onAgentEnd?: (
      ctx: RunContext<VideoGenAgentContext>,
      output: string,
    ) => void;
    /** Callback when tool starts */
    onToolStart?: (
      ctx: RunContext<VideoGenAgentContext>,
      tool: Tool<VideoGenAgentContext>,
      details: ToolCallDetails,
    ) => void;
    /** Callback when tool ends */
    onToolEnd?: (
      ctx: RunContext<VideoGenAgentContext>,
      tool: Tool<VideoGenAgentContext>,
      result: string,
      details: ToolCallDetails,
    ) => void;
  },
): void {
  // Agent start event
  agent.on("agent_start", (ctx, agentInstance) => {
    options?.onAgentStart?.(ctx, agentInstance);
  });

  // Agent end event
  agent.on("agent_end", (ctx, output) => {
    options?.onAgentEnd?.(ctx, output);
  });

  // Agent handoff event (for multi-agent scenarios)
  agent.on("agent_handoff", (_ctx, _nextAgent) => {});

  // Tool start event
  agent.on("agent_tool_start", (ctx, tool, details) => {
    options?.onToolStart?.(ctx, tool, details as ToolCallDetails);
  });

  // Tool end event
  agent.on("agent_tool_end", (ctx, tool, result, details) => {
    options?.onToolEnd?.(ctx, tool, result, details as ToolCallDetails);
  });
}

/**
 * Create a prefixed logger for an agent.
 */
export function createAgentLogger(agentName: string) {
  return {
    log: (message: string, ...args: unknown[]) =>
      console.log(`[${agentName}] ${message}`, ...args),
    info: (message: string, ...args: unknown[]) =>
      console.info(`[${agentName}] (i) ${message}`, ...args),
    warn: (message: string, ...args: unknown[]) =>
      console.warn(`[${agentName}] (!) ${message}`, ...args),
    error: (message: string, ...args: unknown[]) =>
      console.error(`[${agentName}] [ERR] ${message}`, ...args),
    debug: (message: string, ...args: unknown[]) =>
      console.debug(`[${agentName}] [DBG] ${message}`, ...args),
  };
}

/**
 * Timing tracker for agent operations.
 */
export class AgentTimer {
  private startTimes: Map<string, number> = new Map();

  start(operationId: string): void {
    this.startTimes.set(operationId, Date.now());
  }

  end(operationId: string): number | null {
    const startTime = this.startTimes.get(operationId);
    if (!startTime) return null;
    const duration = Date.now() - startTime;
    this.startTimes.delete(operationId);
    return duration;
  }

  /**
   * Log timing for an operation.
   */
  logEnd(
    operationId: string,
    logger: (msg: string) => void = console.log,
  ): void {
    const duration = this.end(operationId);
    if (duration !== null) {
      logger(`[T] ${operationId} completed in ${duration}ms`);
    }
  }
}
