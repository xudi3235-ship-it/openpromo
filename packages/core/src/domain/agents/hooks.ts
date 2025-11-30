/**
 * Agent lifecycle hooks for video generation agent.
 * Provides event-based logging and monitoring.
 *
 * Based on OpenAI Agents SDK hooks pattern.
 */

import type { Agent, RunContext, Tool } from "@openai/agents";
import type { AgentOutput } from "./agent-types";
import type { VideoGenRunContext } from "./context";

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
  agent: Agent<VideoGenRunContext, AgentOutput>,
  options?: {
    /** Enable verbose logging */
    verbose?: boolean;
    /** Custom logger function */
    logger?: (message: string, ...args: unknown[]) => void;
    /** Callback when agent starts */
    onAgentStart?: (
      ctx: RunContext<VideoGenRunContext>,
      agent: Agent<VideoGenRunContext, AgentOutput>,
    ) => void;
    /** Callback when agent ends */
    onAgentEnd?: (ctx: RunContext<VideoGenRunContext>, output: string) => void;
    /** Callback when tool starts */
    onToolStart?: (
      ctx: RunContext<VideoGenRunContext>,
      tool: Tool<VideoGenRunContext>,
      details: ToolCallDetails,
    ) => void;
    /** Callback when tool ends */
    onToolEnd?: (
      ctx: RunContext<VideoGenRunContext>,
      tool: Tool<VideoGenRunContext>,
      result: string,
      details: ToolCallDetails,
    ) => void;
  },
): void {
  const log = options?.logger ?? console.log;
  const verbose = options?.verbose ?? false;

  // Agent start event
  agent.on("agent_start", (ctx, agentInstance) => {
    log(`[${agentInstance.name}] >> Agent started`);
    if (verbose && ctx.context) {
      log(`[${agentInstance.name}] Context:`, {
        product: ctx.context.product,
        business: ctx.context.business,
      });
    }
    options?.onAgentStart?.(ctx, agentInstance);
  });

  // Agent end event
  agent.on("agent_end", (ctx, output) => {
    const preview =
      typeof output === "string"
        ? output.slice(0, 200) + (output.length > 200 ? "..." : "")
        : JSON.stringify(output).slice(0, 200);
    log(`[${agent.name}] << Agent completed:`, preview);
    options?.onAgentEnd?.(ctx, output);
  });

  // Agent handoff event (for multi-agent scenarios)
  agent.on("agent_handoff", (_ctx, nextAgent) => {
    log(`[${agent.name}] -> Handing off to: ${nextAgent.name}`);
  });

  // Tool start event
  agent.on("agent_tool_start", (ctx, tool, details) => {
    log(`[${agent.name}] [>] Tool started: ${tool.name}`);
    if (verbose) {
      const toolCall = details.toolCall as ToolCallDetails["toolCall"];
      log(`[${agent.name}] Tool args:`, toolCall.function?.arguments);
    }
    options?.onToolStart?.(ctx, tool, details as ToolCallDetails);
  });

  // Tool end event
  agent.on("agent_tool_end", (ctx, tool, result, details) => {
    const resultPreview =
      result.length > 500 ? result.slice(0, 500) + "..." : result;
    log(`[${agent.name}] [x] Tool completed: ${tool.name}`);
    if (verbose) {
      log(`[${agent.name}] Tool result:`, resultPreview);
    }
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
