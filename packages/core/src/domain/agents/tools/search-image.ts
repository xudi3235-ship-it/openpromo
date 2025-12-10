import { SerperSearch } from "@core/providers";
import { type ToolOutputImage, tool } from "@openai/agents";
import z from "zod";
import type { VideoGenAgentContext } from "../context";

const SearchImageParams = z.object({
  query: z.string().min(1),
  num: z.number().int().min(1).max(10).default(5),
});

export const searchImageTool = tool<VideoGenAgentContext, VideoGenAgentContext>(
  {
    name: "search_image",
    description:
      "Search images via serper.dev and return public URLs as ToolOutputImage objects (detail=low).",
    parameters: SearchImageParams,
    isEnabled(args) {
      const context = args.runContext.context;
      return context.stage === "video_gen";
    },
    async execute(params) {
      const { query, num } = SearchImageParams.parse(params);

      const resp = await SerperSearch.searchImages({ q: query, num });
      const images: ToolOutputImage[] =
        resp.images?.slice(0, num).map((img) => ({
          type: "image",
          image: img.imageUrl,
          detail: "low",
        })) ?? [];

      return images;
    },
  },
);
