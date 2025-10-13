import { Actor } from "@core/helpers/actor";
import {
  type CoreWorkflowContext,
  CoreWorkflowEntrypoint,
  type CoreWorkflowEvent,
  type CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";
import { z } from "zod";

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
  }
}
