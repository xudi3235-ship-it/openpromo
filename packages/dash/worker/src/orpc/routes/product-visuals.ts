import { EntImageGeneration } from "@core/domain/image-generation";
import { EntVideoGeneration } from "@core/domain/video-generation";
import type { ImageGenerationState } from "@core/schemas/image-generation.sql";
import type { VideoGenerationState } from "@core/schemas/video-generation.sql";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import { z } from "zod";
import { orpcBuilder } from "../context";
import { withWorkspaceRole } from "../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../shared/workspace-helpers";

const listProductVisualsInput = createWorkspaceInputSchema(
  z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(30).default(18),
  }),
);

type FeedItemBase = {
  id: string;
  type: "image" | "video";
  createdAt: string | null;
  productId: string | null;
  styleComponentId: string | null;
  previewUrl: string | null;
  outputUrl: string | null;
};

type ImageFeedItem = FeedItemBase & {
  type: "image";
  state: ImageGenerationState;
  stateMessage: string | null;
  prompt: string | null;
};

type VideoFeedItem = FeedItemBase & {
  type: "video";
  state: VideoGenerationState;
  stateMessage: string | null;
};

type ProductVisualsFeedItem = ImageFeedItem | VideoFeedItem;

const toISO = (value?: Date | string | null): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
};

const toImageFeedItem = (generation: EntImageGeneration): ImageFeedItem => {
  const data = generation.toJSON();
  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  const previewUrl =
    data.outputImages?.[0] ??
    (typeof metadata.referenceImageUrl === "string"
      ? metadata.referenceImageUrl
      : Array.isArray(metadata.inputImages)
        ? ((metadata.inputImages[0] as string | undefined) ?? null)
        : null);

  const prompt =
    typeof metadata.prompt === "string"
      ? metadata.prompt
      : typeof metadata.variationPrompt === "string"
        ? metadata.variationPrompt
        : null;

  return {
    id: data.id,
    type: "image",
    createdAt: toISO(data.createdAt),
    productId: data.productId ?? null,
    styleComponentId: data.styleComponentId ?? null,
    previewUrl,
    outputUrl: data.outputImages?.[0] ?? null,
    state: data.state,
    stateMessage: data.stateMessage ?? null,
    prompt,
  };
};

const toVideoFeedItem = (generation: EntVideoGeneration): VideoFeedItem => {
  const data = generation.toJSON();
  const metadata = data.metadata ?? {};
  const previewUrl =
    data.outputVideoUrl ??
    metadata.productImages?.[0] ??
    metadata.avatarImages?.[0] ??
    null;

  return {
    id: data.id,
    type: "video",
    createdAt: toISO(data.createdAt),
    productId: data.productId ?? null,
    styleComponentId: data.styleComponentId ?? null,
    previewUrl,
    outputUrl: data.outputVideoUrl ?? null,
    state: data.state,
    stateMessage: data.stateMessage ?? null,
  };
};

const MAX_FETCH_SIZE = 90;

export const listProductVisualsFeed = orpcBuilder
  .input(listProductVisualsInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const { page, pageSize } = input;
    const fetchSize = Math.min(page * pageSize, MAX_FETCH_SIZE);

    const [imageResult, videoResult] = await Promise.all([
      EntImageGeneration.list({
        page: 1,
        pageSize: fetchSize,
      }),
      EntVideoGeneration.list({
        page: 1,
        pageSize: fetchSize,
      }),
    ]);

    const combined: ProductVisualsFeedItem[] = [
      ...imageResult.generations.map((generation) =>
        toImageFeedItem(generation),
      ),
      ...videoResult.generations.map((generation) =>
        toVideoFeedItem(generation),
      ),
    ].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    const startIndex = (page - 1) * pageSize;
    const items = combined.slice(startIndex, startIndex + pageSize);

    const total = imageResult.pagination.total + videoResult.pagination.total;
    const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  });

export const productVisualsRouter = {
  feed: listProductVisualsFeed,
};

export type ProductVisualsRouterOutputs = InferRouterOutputs<
  typeof productVisualsRouter
>;
export type ProductVisualsRouterInputs = InferRouterInputs<
  typeof productVisualsRouter
>;
