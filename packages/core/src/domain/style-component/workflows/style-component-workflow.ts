import { areInputsSafe } from "@core/domain/genai/helpers";
import { Actor } from "@core/helpers/actor";
import {
  type CoreWorkflowContext,
  CoreWorkflowEntrypoint,
  type CoreWorkflowEvent,
  type CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";
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
      return await areInputsSafe(s.data.description, s.data.imageRefs);
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
    // 2. process the images, parse them, generate metadata, suitable industry
    // tags, etc.
  }
}
