import fs from "node:fs";
import { getGeminiClient } from "@core/providers/gemini";
import { isStringUrl } from "@core/utils/common";
import { type ContentListUnion, ThinkingLevel } from "@google/genai";
import { tool } from "@openai/agents";
import z from "zod";
import { PRIMARY_GOAL } from "../constants";
import type { VideoGenAgentContext } from "../context";
import { downloadImagesToTmp, downloadVideosToTmp } from "../utils";

const toolParams = z.object({
  videoUrlOrPath: z.string().describe("Path or URL to the input video file."),
  context: z.string().describe("additional context"),
  productImagePaths: z
    .string()
    .array()
    .describe("list of product images, file or url that biz is selling"),
});

const specSchema = z.object({
  blueprint: z.string().describe("Overall blueprint/spec for the video"),
  extra: z.string().describe("Any extra notes or comments"),
});

const sysPrompt = `
<role>
You are an expert at analyzing viral social media video ads, shorts, ugc content. You excel at deconstructing the viral elements, shot breakdowns, hooks, everything into a comprehensive spec/template/blueprint that can be used to replicate the image/video to promote other products/services/brands effectively, targeting SMBs. Key is to get ideas/concepts that made the original video successful, and extrapolate them into a adaptable blueprint.

you are part of larger system, with our primary goal of: ${PRIMARY_GOAL}
</role>


<context>
Replication workflow is: the video has shots, overall structure, hooks, visual/audio elements, psychological triggers, meme, etc that captured the engagements. Next the spec will include artifacts, details, each shot breakdown etc and rough duration timings etc. higher level agent will use the spec as north star ref to invoke tools like image gen, to compose the static keyframe/ingridients first, then use them for video gen, or extension etc. The agent is focusing on execution details, so you need to provide effective, detailed spec, guidelines for successful replication.
</context>

<scope>
* focus on why it worked well, extrapolate and structure the elemnets. Reason first about the linkage between products, target audience, and the viral vid;
* our final delivery is fro social media shorts/ads; primarily vertical format, tiktok, reels, etc.

</scope>

<constraints>
- ensure the spec is detailed, comprehensive, covering all critical aspects to replicate the video effectively;
- output strictly in JSON format as per the schema provided;
- if any critical info is missing from input video, make reasonable assumptions based on typical viral video characteristics.
</constraints>
`;

function _imgInline(path: string) {
  const base64Data = fs.readFileSync(path, { encoding: "base64" });
  return {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Data,
    },
  };
}
function videoInline(path: string) {
  const base64Data = fs.readFileSync(path, { encoding: "base64" });
  return {
    inlineData: {
      mimeType: "video/mp4",
      data: base64Data,
    },
  };
}

async function toolImpl({
  videoUrlOrPath: videoPath,
  productImagePaths,
  context,
}: z.infer<typeof toolParams>) {
  const gemini = getGeminiClient();

  if (isStringUrl(videoPath)) {
    // download
    videoPath = (await downloadVideosToTmp([videoPath], "/tmp"))[0];
  }

  const contents: ContentListUnion = [];

  // 1. input video
  contents.push({
    text: `here is the ad/video to analyze`,
    role: "user",
  });
  contents.push(videoInline(videoPath));

  // 2. product images
  contents.push({
    text: `here are the product images for my product/business`,
    role: "user",
  });
  const localImagePaths = await downloadImagesToTmp(
    productImagePaths.filter(isStringUrl),
    "/tmp",
  );
  for (const imgPath of localImagePaths) {
    contents.push(_imgInline(imgPath));
  }
  // 3. additional context
  contents.push({
    text: `here is the additional context for this run`,
    role: "user",
  });
  contents.push({
    text: context,
    role: "user",
  });

  const response = await gemini.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: contents,
    config: {
      systemInstruction: sysPrompt,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(specSchema), // TODO: check to ensure this work with zod v4
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH,
      },
    },
  });

  console.log("Video spec analysis response:", response.text);

  if (!response.text) {
    console.error("No response text received from Gemini.");
    return `No response from gemini api`;
  }

  try {
    const parsed = JSON.parse(response.text);
    return specSchema.parse(parsed);
  } catch (error) {
    console.error("Failed to parse response:", error);
    return `Failed to parse response: ${error}`;
  }
}

export const videoToSpecTool = tool<VideoGenAgentContext, VideoGenAgentContext>(
  {
    name: "video_to_spec",
    description:
      "takes in a social media video ad, analyzes it, and produces a comprehensive spec/blueprint that can be used to replicate the video effectively for promoting products/services/brands for small businesses.",
    parameters: toolParams,
    isEnabled(args) {
      const context = args.runContext.context as VideoGenAgentContext;
      return context.stage === "video_gen";
    },
    execute: async (args: z.infer<typeof toolParams>) => {
      return await toolImpl(args);
    },
  },
);
