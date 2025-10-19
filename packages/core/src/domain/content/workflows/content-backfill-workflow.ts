import { ConnectedAccount } from "@core/domain/connected-account";
import {
  FacebookBackfiller,
  InstagramBackfiller,
  TikTokBackfiller,
} from "@core/domain/content/backfill";
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

const noRetries = {
  retries: {
    limit: 0,
    delay: 1000,
  },
};
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

    const platform = await step.do("determine backfiller type", async () => {
      const account = await ConnectedAccount.fromID(payload.connectedAccountID);
      return account.platform;
    });

    if (!["FACEBOOK", "INSTAGRAM", "TIKTOK"].includes(platform)) {
      throw new Error(
        `Unsupported connected account platform for backfill: ${platform}`,
      );
    }

    if (platform === "INSTAGRAM") {
      return await step.do("instagram backfill", noRetries, async () => {
        const backfiller = new InstagramBackfiller();
        const result = await backfiller.backfill(
          {
            connectedAccountId: payload.connectedAccountID,
            start: new Date(payload.start),
            end: new Date(payload.end),
          },
          { step },
        );

        log.info("content backfill completed", {
          connectedAccountId: payload.connectedAccountID,
          inserted: result.inserted,
          skipped: result.skipped,
          fetched: result.fetched,
        });

        return result;
      });
    }

    if (platform === "FACEBOOK") {
      return await step.do("facebook backfill", noRetries, async () => {
        const backfiller = new FacebookBackfiller();
        const result = await backfiller.backfill(
          {
            connectedAccountId: payload.connectedAccountID,
            start: new Date(payload.start),
            end: new Date(payload.end),
          },
          { step },
        );

        log.info("content backfill completed", {
          connectedAccountId: payload.connectedAccountID,
          inserted: result.inserted,
          skipped: result.skipped,
          fetched: result.fetched,
        });

        return result;
      });
    }

    return await step.do("tiktok backfill", noRetries, async () => {
      const backfiller = new TikTokBackfiller();
      const result = await backfiller.backfill(
        {
          connectedAccountId: payload.connectedAccountID,
          start: new Date(payload.start),
          end: new Date(payload.end),
        },
        { step },
      );

      log.info("content backfill completed", {
        connectedAccountId: payload.connectedAccountID,
        inserted: result.inserted,
        skipped: result.skipped,
        fetched: result.fetched,
      });

      return result;
    });
  }
}
