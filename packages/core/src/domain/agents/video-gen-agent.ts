import { openai } from "@ai-sdk/openai";
import type { ApiEnv } from "@core/helpers/api-env";
// import { routeAgentRequest } from "agents";

import { AIChatAgent } from "agents/ai-chat-agent";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type StreamTextOnFinishCallback,
  stepCountIs,
  streamText,
  type ToolSet,
} from "ai";

/**
 * video generation ai agent.
 */
export class VideoGenAgent extends AIChatAgent<ApiEnv> {
  /**
   * Handles incoming chat messages and manages the response stream
   */
  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    _options?: { abortSignal?: AbortSignal },
  ) {
    console.log(`[VideoGenAgent] onChatMessage called`);
    console.log(`[VideoGenAgent] Messages count: ${this.messages.length}`);
    console.log(`[VideoGenAgent] Current messages:`, this.messages);

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        console.log(`[VideoGenAgent] Creating message stream`);
        const result = streamText({
          system: "You are a helpful assistant.",
          messages: convertToModelMessages(this.messages),
          model: openai("gpt-5-mini"),
          onFinish: onFinish as unknown as StreamTextOnFinishCallback<ToolSet>,
          stopWhen: stepCountIs(10),
        });

        console.log(`[VideoGenAgent] Merging stream with writer`);
        writer.merge(result.toUIMessageStream());
      },
    });

    console.log(`[VideoGenAgent] Returning response stream`);
    return createUIMessageStreamResponse({ stream });
  }
}
