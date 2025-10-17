import { ConnectedAccount } from "@core/domain/connected-account";
import { FacebookBackfiller } from "@core/domain/content/backfill";
import { Actor } from "@core/helpers/actor";
import {
  type CoreWorkflowContext,
  CoreWorkflowEntrypoint,
  type CoreWorkflowEvent,
  type CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";
import z from "zod";

const ContentBackfillWorkflowParams = z.object({
  actor: Actor.WorkspaceUserSchema,
  connectedAccountID: z.string(),
  start: z.iso.datetime(),
  end: z.iso.datetime(),
});

export type ContentBackfillWorkflowParams = z.infer<
  typeof ContentBackfillWorkflowParams
>;

const log = Log.create({ namespace: "content-backfill-workflow" });

export class ContentBackfillWorkflow extends CoreWorkflowEntrypoint<ContentBackfillWorkflowParams> {
  async runWithContext(
    _ctx: CoreWorkflowContext,
    event: CoreWorkflowEvent<ContentBackfillWorkflowParams>,
    step: CoreWorkflowStep,
  ) {
    const payload = ContentBackfillWorkflowParams.parse(event.payload);

    log.info("starting content backfill workflow", {
      connectedAccountId: payload.connectedAccountID,
      start: payload.start,
      end: payload.end,
    });

    await step.do("determine backfiller type", async () => {
      const account = await ConnectedAccount.fromID(payload.connectedAccountID);
      if (account.platform !== "FACEBOOK") {
        console.log(
          "// Unsupported connected account platform:",
          account.platform,
        );
        throw new Error(
          `unsupported connected account platform: ${account.platform}`,
        );
      }
    });
    console.log(
      "// Determined backfiller type for account:",
      payload.connectedAccountID,
    );

    await step.do(
      "facebook backfill",
      {
        retries: {
          backoff: "exponential",
          limit: 0, // dont wanna spam fb api too much
          delay: 1000,
        },
      },
      async () => {
        const backfiller = new FacebookBackfiller();
        const result = await backfiller.backfill({
          connectedAccountId: payload.connectedAccountID,
          start: new Date(payload.start),
          end: new Date(payload.end),
        });

        log.info("content backfill completed", {
          connectedAccountId: payload.connectedAccountID,
          inserted: result.inserted,
          skipped: result.skipped,
          fetched: result.fetched,
        });

        return result;
      },
    );
  }
}
