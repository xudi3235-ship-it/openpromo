import { openai } from "@ai-sdk/openai";
import { Actor } from "@core/helpers/actor";
import {
  type CoreWorkflowContext,
  CoreWorkflowEntrypoint,
  type CoreWorkflowEvent,
  type CoreWorkflowStep,
} from "@core/helpers/workflow";
import { StyleContext } from "@core/schemas/style.sql";
import { Log } from "@core/utils/log";
import { generateObject, type ImagePart } from "ai";
import { z } from "zod";
import { EntStyleComponent } from "../EntStyleComponent";

const StyleComponentWorkflowParams = z.object({
  actor: Actor.WorkspaceUserSchema,
  styleComponentId: z.string(),
});

export type StyleComponentWorkflowParams = z.infer<
  typeof StyleComponentWorkflowParams
>;

const log = Log.create({ namespace: "style-component-workflow" });

/**
 * ref:
 * https://developers.cloudflare.com/images/transform-images/transform-via-url/
 * compress imgs
 */
function tranformImgs(imageUrls: string[]): string[] {
  return imageUrls.map((url) => {
    try {
      const parsedUrl = new URL(url);
      // For bucket.openpromo.app URLs, transform via cdn-cgi
      if (parsedUrl.hostname === "bucket.openpromo.app") {
        console.log("Transforming image URL", { url });
        // FIXME: replace it with env var for different envs
        return `https://staging.openpromo.app/cdn-cgi/image/quality=75,format=auto,width=1024,fit=scale-down/${url}`;
      }
      return url;
    } catch (error) {
      console.error("Failed to transform image URL", { url, error });
      return url; // Return original on error
    }
  });
}

/**
 * StyleComponentWorkflow
 *
 * Placeholder workflow scaffolding for future automation when a style is created.
 * Currently this just logs incoming payload and exits.
 */
export class StyleComponentWorkflow extends CoreWorkflowEntrypoint<StyleComponentWorkflowParams> {
  async runWithContext(
    _ctx: CoreWorkflowContext,
    event: CoreWorkflowEvent<StyleComponentWorkflowParams>,
    step: CoreWorkflowStep,
  ) {
    console.log("// Style component workflow triggered", event);
    const { styleComponentId } = event.payload;
    log.info("// Style component workflow triggered", { styleComponentId });
    // 0. set style to processing
    await step.do("mark-style-processing", async () => {
      const s = await EntStyleComponent.fromID(styleComponentId);
      await s.update({
        state: "processing",
      });
    });

    console.log("// Style component workflow triggered", { styleComponentId });
    // 1. transform and compress images for AI processing
    const compressedImageUrls = await step.do(
      "transform-compress-images",
      async () => {
        const s = await EntStyleComponent.fromID(styleComponentId);
        return tranformImgs(s.data.imageRefs);
      },
    );
    console.log("// Compressed images for AI", { compressedImageUrls });

    console.log("// Generating style context", { styleComponentId });
    // 3. generate style context using compressed images
    await step.do("generate-style-context", async () => {
      const s = await EntStyleComponent.fromID(styleComponentId);
      const { context, safe, reason } = await generateStyleContext(
        s,
        compressedImageUrls,
      );

      if (!safe) {
        log.warn("// Style component failed guardrail check", {
          styleComponentId,
          reason,
        });
        await s.update({
          state: "failed",
          failureReason: reason ?? "Unknown reason",
        });
        return;
      }
      console.log("// Generated style context", { context });
      await s.update({
        context,
      });
    });
    console.log("// Marking style as ready", { styleComponentId });
    // 4. mark style as ready
    await step.do("mark-style-ready", async () => {
      const s = await EntStyleComponent.fromID(styleComponentId);
      await s.update({
        state: "ready",
      });
    });
  }
}

async function generateStyleContext(
  _style: EntStyleComponent,
  imageUrls: string[],
) {
  const sysMsg = `You are an expert in social media marketing and creative ad concepts. Your task is to analyze multiple user-supplied images, describe the visual "style" of each, extract and articulate notable visual and thematic features, infer the social intent behind each design, and identify industries or product categories where these visual styles can be effectively utilized to drive measurable outcomes (such as increased sales or conversions).

!!!MUST FOLLOW the output schema

INSTRUCTIONS + RULES:
- for all the images, summarize and consolidate:
  - A clear and concise summary of the overall visual style.
  - Key details including main elements, colors, motifs, and composition.
  - The likely social aim, messaging intent, or engagement purpose behind the design.
  - A list of relevant industries or product categories where the style could maximize results.
  - images prompt: image prompts used to generate these images, single paragraph, concise, verbose, effective, detailed.
- Adhere strictly to the specified output JSON schema. Mark any unknown attribute as 'Unknown'.
- If the images are NSFW or contains violent, hateful content, use the safe field and reason field to indicate it.
  `;
  try {
    const res = await generateObject({
      model: openai("gpt-5-mini"),
      maxOutputTokens: 500,
      messages: [
        { role: "system", content: sysMsg },
        {
          role: "user",
          content: [
            ...imageUrls.map(
              (i) =>
                ({
                  type: "image",
                  image: i,
                }) as ImagePart,
            ),
          ],
        },
      ],
      schema: z.object({
        safe: z.boolean().describe("whether the inputs are safe"),
        reason: z.string().nullable().describe("if not safe, the reason why"),
        context: StyleContext,
      }),
    });
    console.log("generateStyleContext result", res.object);

    return res.object;
  } catch (error) {
    console.error("generateStyleContext failed", { error });
    throw error;
  }
}
