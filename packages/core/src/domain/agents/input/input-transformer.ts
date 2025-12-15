import type { AgentInputItem } from "@openai/agents";
import type { VideoGenRealtime } from "@shared/agents";
import type { Presets } from "../presets";
import type { ActorStore } from "../state/actor-store";
import { toAgentImageInputs } from "../tools/evaluation-utils";
import { buildTreeString } from "../utils";
import { downloadInputFiles } from "./file-manager";

/**
 * Transforms video generation input state into OpenAI Agent input items.
 *
 * Handles image processing, preset loading, and message formatting
 * for agent consumption.
 */
export class InputTransformer {
  constructor(
    private actorStore: ActorStore,
    private presetManager: Presets.Manager,
  ) {}

  /**
   * Transform input state into agent-compatible input items.
   * Downloads files, processes images, loads presets, and formats messages.
   */
  async transform(input: VideoGenRealtime.Input): Promise<AgentInputItem[]> {
    console.log(`[InputTransformer] Creating input from state`, input);

    // Download all files to /tmp
    const filePaths = await downloadInputFiles(input);

    // Convert URLs to agent image inputs
    const productImages = toAgentImageInputs(input.productImages);
    const avatarImages = toAgentImageInputs(input.avatarImages);
    const referenceImages = toAgentImageInputs(input.referenceImages);
    const brandAssets = toAgentImageInputs(input.brandAssets);

    const messages: AgentInputItem[] = [];

    // Product images
    if (productImages.length > 0) {
      messages.push({
        role: "user",
        content: [
          {
            type: "input_text" as const,
            text: `Product reference files stored under /tmp/products. Local paths: ${filePaths.productImagePaths.join(", ")}`,
          },
          ...productImages,
        ],
      });
    }

    // Avatar images
    if (avatarImages.length > 0) {
      messages.push({
        role: "user",
        content: [
          {
            type: "input_text" as const,
            text: `Avatar references stored under /tmp/avatar. Local paths: ${filePaths.avatarImagePaths.join(", ")}`,
          },
          ...avatarImages,
        ],
      });
    }

    // Reference images
    if (referenceImages.length > 0) {
      messages.push({
        role: "user",
        content: [
          {
            type: "input_text" as const,
            text: "Additional reference images:",
          },
          ...referenceImages,
        ],
      });
    }

    // Brand assets
    if (brandAssets.length > 0) {
      messages.push({
        role: "user",
        content: [
          {
            type: "input_text" as const,
            text: "Brand assets:",
          },
          ...brandAssets,
        ],
      });
    }

    // Tmp directory snapshot
    messages.push({
      role: "user",
      content: [
        {
          type: "input_text" as const,
          text: `Latest tmp dir snapshot (cwd=/tmp):\n${InputTransformer.getTmpDirSnapshot()}`,
        },
      ],
    });

    // Load reference if specified
    if (input.presetId) {
      const msgToAdd = await this.presetManager.getByIDToAgentInput(
        input.presetId,
      );
      messages.push(...msgToAdd);
    }
    const actor = await this.actorStore.get();

    if (actor?.properties.featureFlags.includes("is_internal")) {
      console.log(
        `[InputTransformer] Detected internal developer actor, applying special instructions.`,
      );
      messages.push({
        role: "system",
        content: `NOTE: this is internal developer, instructions from developer has highest priority than previous instructions.`,
      });
    }

    // mode input
    messages.push({
      role: "system",
      content: `user selected mode: ${input.mode}. This is for the final deliverable format decision - whether images or video.`,
    });

    // Final user prompt
    messages.push({
      role: "user",
      content: [
        {
          type: "input_text" as const,
          text: `user input: ${input.prompt}`,
        },
      ],
    });
    return messages;
  }

  async fromProductImages(
    input: VideoGenRealtime.Input,
  ): Promise<AgentInputItem[]> {
    const filePaths = await downloadInputFiles(input);
    const imgParts = toAgentImageInputs(input.productImages);
    const txtPart = {
      type: "input_text" as const,
      text: `here are the product messages Product reference files stored under /tmp/products. Local paths: ${filePaths.productImagePaths.join(", ")}`,
    };
    const messages: AgentInputItem[] = [
      {
        role: "user",
        content: [txtPart, ...imgParts],
      },
    ];
    return messages;
  }

  async fromImageArtifacts(
    state: VideoGenRealtime.ServerAppState,
  ): Promise<AgentInputItem[]> {
    const imgParts = state.artifacts.images.map((img) => ({
      type: "input_image" as const,
      image: img.imageUrl,
    }));
    return [
      {
        role: "system",
        content: `system checkpoint: below are the image artifacts generated from subagents so far.`,
      },
      {
        role: "user",
        content: imgParts,
      },
    ];
  }

  /**
   * Get the current structure of the tmp directory as a string.
   * Uses node:fs which is available in Cloudflare Workers VFS.
   */
  static getTmpDirSnapshot(): string {
    try {
      const tmpBasePath = "/tmp";
      return `${tmpBasePath}/\n${buildTreeString(tmpBasePath, "")}`;
    } catch {
      return "Unable to read tmp directory structure";
    }
  }
}
