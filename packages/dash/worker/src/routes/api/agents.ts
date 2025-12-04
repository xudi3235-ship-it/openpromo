import type { ApiEnv } from "@core/helpers/api-env";
import { getGlobalTraceProvider } from "@openai/agents";
import type { VideoGenAgent } from "@openpromo/core/domain/agents/video-gen-agent";
import { getAgentByName } from "agents";
import { Hono } from "hono";

export const agentsRoute = new Hono<ApiEnv>()
  // Handle dynamic agent paths: /agents/:agentName/:instanceId/*
  .all("/:agentName/:instanceId{.*}", async (c) => {
    const agentName = c.req.param("agentName");
    const instanceId = c.req.param("instanceId");
    const method = c.req.method;
    // const url = new URL(c.req.url);

    // console.log(`[agents] ${method} /${agentName}/${instanceId}`);
    // console.log(`[agents] Full path: ${url.pathname}`);
    // console.log(`[agents] Query: ${url.search}`);

    try {
      // Get the agent instance using the VideoGenAgent binding
      console.log(`[agents] Getting agent instance: ${instanceId}`);
      const agent = getAgentByName<ApiEnv, VideoGenAgent>(
        c.env.VideoGenAgent,
        instanceId,
      );
      // console.log(`[agents] Agent stub retrieved`);

      // Pass the request to the agent
      // console.log(`[agents] Forwarding request to agent...`);
      const response = await (await agent).fetch(c.req.raw);
      // console.log(
      //   `[agents] ${method} /${agentName}/${instanceId} -> ${response.status}`,
      // );
      return response;
    } catch (error) {
      console.error(
        `[agents] Error handling ${method} /${agentName}/${instanceId}:`,
        error,
      );
      return c.json(
        { error: "Failed to route to agent", details: String(error) },
        500,
      );
    } finally {
      // ensure traces are flushed for worker runtime
      // https://openai.github.io/openai-agents-js/guides/tracing/#export-loop-lifecycle
      c.executionCtx.waitUntil(getGlobalTraceProvider().forceFlush());
    }
  });
