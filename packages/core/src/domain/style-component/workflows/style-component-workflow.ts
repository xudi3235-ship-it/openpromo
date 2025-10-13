import { openai } from "@ai-sdk/openai";
import { GenAI } from "@core/domain/genai/helpers";
import { Actor } from "@core/helpers/actor";
import {
  type CoreWorkflowContext,
  CoreWorkflowEntrypoint,
  type CoreWorkflowEvent,
  type CoreWorkflowStep,
} from "@core/helpers/workflow";
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
    const { styleComponentId } = event.payload;
    log.info("// Style component workflow triggered", { styleComponentId });

    await step.do("noop", async () => {
      log.info("// Style component workflow noop step", { styleComponentId });
      return;
    });
    // here's what we need to do, if it's a new style created
    // 1. guardrail check - if the images are inappropriate, mark it as failed
    const { safe, reason } = await step.do("guardrail-check-imgs", async () => {
      const s = await EntStyleComponent.fromID(styleComponentId);
      return await GenAI.areInputsSafe(s.data.description, s.data.imageRefs);
    });
    if (!safe) {
      log.warn("// Style component failed guardrail check", {
        styleComponentId,
        reason,
      });
      await step.do("mark-style-failed", async () => {
        const s = await EntStyleComponent.fromID(styleComponentId);
        await s.update({
          state: "failed",
          failureReason: reason ?? "Unknown reason",
        });
      });
      return;
    }
    // 2. generate style context
    await step.do("generate-style-context", async () => {
      const s = await EntStyleComponent.fromID(styleComponentId);
      const context = await generateStyleContext(s);
      await s.update({
        context,
      });
    });
  }
}

export const StyleContext = z.object({
  imagesPrompt: z
    .string()
    .describe(
      "image prompts of the input images, detailed, effective, concise, can be used to generate similar images to refs",
    ),
  industry: z.array(z.string()).describe("industries suitable for this style"),
  categories: z
    .array(z.string())
    .describe("categories suitable for this style"),
  searchKeywords: z
    .array(z.string())
    .describe("4-7 search keywords that can be used to search for this style."),
});

export type StyleContext = z.infer<typeof StyleContext>;

async function generateStyleContext(
  style: EntStyleComponent,
): Promise<StyleContext> {
  const sysMsg = `Developer: Role and Objective:
You are an expert in social media marketing and creative ad concepts. Your task is to analyze multiple user-supplied images, describe the visual "style" of each, extract and articulate notable visual and thematic features, infer the social intent behind each design, and identify industries or product categories where these visual styles can be effectively utilized to drive measurable outcomes (such as increased sales or conversions).

Begin with a concise checklist (3-7 bullets) of what you will do; keep items conceptual and high-level.

Instructions:
- For each image input, provide:
  - A clear and concise summary of the overall visual style.
  - Key details including main elements, colors, motifs, and composition.
  - The likely social aim, messaging intent, or engagement purpose behind the design.
  - A list of relevant industries or product categories where the style could maximize results.
- Adhere strictly to the specified output JSON schema. Mark any unknown attribute as 'Unknown'.
- Remain brief but thorough; focus on relevant and actionable details only.
- Set reasoning_effort = medium to ensure sufficient detail without unnecessary verbosity.
- After producing output, validate that all required fields are present and formatted as specified; if any field cannot be confidently inferred, assign 'Unknown'.
  `;
  const res = await generateObject({
    model: openai("gpt-5"),
    temperature: 0.2,
    maxOutputTokens: 1000,
    messages: [
      { role: "system", content: sysMsg },
      {
        role: "user",
        content: [
          ...style.data.imageRefs.map(
            (i) =>
              ({
                type: "image",
                image: i,
              }) as ImagePart,
          ),
        ],
      },
    ],
    schema: StyleContext,
  });

  return res.object;
}
