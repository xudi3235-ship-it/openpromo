import { ReferenceSearch } from "@core/domain/reference/reference-search";
import { SerperSearch } from "@core/providers";
import {
  type ToolOutputImage,
  type ToolOutputText,
  tool,
} from "@openai/agents";
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

const searchReferencesParams = z.object({
  query: z
    .string()
    .min(1)
    .describe("3-5 keywords, more specific more accurate"),
});

export const searchReferencesTool = tool<
  VideoGenAgentContext,
  VideoGenAgentContext
>({
  name: "search_references",
  description:
    "Search refernces from internal ad creative references lib, collections of high-quality ad visuals for inspiration and style ref.",
  parameters: searchReferencesParams,
  isEnabled(args) {
    const context = args.runContext.context;
    return context.stage === "video_gen";
  },
  async execute(params) {
    const { query } = searchReferencesParams.parse(params);

    const matches = await ReferenceSearch.findSimilar(query, { topK: 10 });
    console.log("[searchReferencesTool] reference search matches:", matches);
    // urls
    const imageUrls = await Promise.all(
      matches.map(async (m) => await ReferenceSearch.getPresignedUrl(m.id)),
    );

    const txtParts: ToolOutputText[] = matches.map((m) => ({
      type: "text",
      text: `matches: ${JSON.stringify(m)}, urls: ${imageUrls}`,
    }));

    const imgParts: ToolOutputImage[] = imageUrls.map((img) => ({
      type: "image",
      image: img,
      detail: "low",
    }));

    return [...txtParts, ...imgParts];
  },
});
