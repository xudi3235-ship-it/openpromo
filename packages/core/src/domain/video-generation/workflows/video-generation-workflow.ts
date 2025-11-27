import { Actor } from "@core/helpers/actor";
import {
  type CoreWorkflowContext,
  CoreWorkflowEntrypoint,
  type CoreWorkflowEvent,
  type CoreWorkflowStep,
} from "@core/helpers/workflow";
import { jobsClient } from "@core/rpc";
import { Log } from "@core/utils/log";
import { JobStatus } from "@shared/gen/jobs/v1/jobs_pb";
import { z } from "zod";
import { EntVideoGeneration } from "../EntVideoGeneration";

const VideoGenerationWorkflowParams = z.object({
  actor: Actor.WorkspaceUserSchema,
  generationId: z.string(),
});

export type VideoGenerationWorkflowParams = z.infer<
  typeof VideoGenerationWorkflowParams
>;

const log = Log.create({ namespace: "video-generation-workflow" });

// Polling config
const POLL_INTERVAL_SECONDS = 5;
const MAX_POLL_ATTEMPTS = 360; // 30 minutes max (360 * 5s)

/**
 * Video Generation Workflow
 *
 * This workflow:
 * 1. Submits a video generation job to the backend via Connect RPC
 * 2. Polls for job completion
 * 3. Updates the generation record with the result
 *
 * The backend runs the actual AI agent on Modal.
 */
export class VideoGenerationWorkflow extends CoreWorkflowEntrypoint<VideoGenerationWorkflowParams> {
  async runWithContext(
    _ctx: CoreWorkflowContext,
    event: CoreWorkflowEvent<VideoGenerationWorkflowParams>,
    step: CoreWorkflowStep,
  ) {
    const { generationId } = event.payload;
    log.info("Starting video generation workflow", { generationId });

    try {
      // 1. Mark as pending and submit job
      const callId = await step.do("submit-job", async () => {
        const g = await EntVideoGeneration.fromID(generationId);
        await g.setState("pending", "Submitting job to backend...");

        const metadata = g.data.metadata;
        if (!metadata) {
          throw new Error("Generation missing metadata");
        }

        const response = await jobsClient.submitAgentVideoJob({
          product: metadata.prompt,
          productImgs: metadata.productImages,
          avatarImgs: metadata.avatarImages ?? [],
          business: "", // TODO: add business context to metadata if needed
          userMessage: metadata.prompt,
          maxTurns: 100,
          workspaceId: g.data.workspaceId,
        });

        log.info("Job submitted", { callId: response.callId, generationId });
        return response.callId;
      });

      // 2. Mark as generating
      await step.do("mark-generating", async () => {
        const g = await EntVideoGeneration.fromID(generationId);
        await g.setState("generating", `Job running: ${callId}`);
        await g.dispatchUpdateEvent();
      });

      // 3. Poll for completion
      let pollAttempt = 0;
      let jobCompleted = false;

      while (!jobCompleted && pollAttempt < MAX_POLL_ATTEMPTS) {
        pollAttempt++;

        await step.sleep(
          `poll-wait-${pollAttempt}`,
          `${POLL_INTERVAL_SECONDS} seconds`,
        );

        const result = await step.do(`poll-${pollAttempt}`, async () => {
          const response = await jobsClient.getJobResult({ callId });

          if (response.status === JobStatus.PENDING) {
            log.info("Job still pending", {
              generationId,
              attempt: pollAttempt,
            });
            return { done: false, response };
          }

          return { done: true, response };
        });

        if (result.done) {
          jobCompleted = true;
          const response = result.response;

          await step.do("handle-result", async () => {
            const g = await EntVideoGeneration.fromID(generationId);

            if (response.status === JobStatus.FAILED) {
              await g.setState("failed", response.error ?? "Job failed");
              await g.dispatchUpdateEvent();
              return;
            }

            if (response.status === JobStatus.SUCCEEDED) {
              if (response.result.case !== "videoGenResult") {
                await g.setState("failed", "Unexpected result type");
                await g.dispatchUpdateEvent();
                return;
              }

              const out = response.result.value.out;
              if (!out || out.data.case !== "success") {
                const errorMsg =
                  out?.data.case === "error"
                    ? out.data.value.errorMessage
                    : "No output from agent";
                await g.setState("failed", errorMsg);
                await g.dispatchUpdateEvent();
                return;
              }

              await g.update({
                state: "completed",
                stateMessage: out.data.value.summary,
                outputVideoUrl: out.data.value.videoUrl,
              });
              await g.dispatchUpdateEvent();

              log.info("Video generation completed", {
                generationId,
                videoUrl: out.data.value.videoUrl,
              });
            }
          });
        }
      }

      if (!jobCompleted) {
        await step.do("timeout", async () => {
          const g = await EntVideoGeneration.fromID(generationId);
          await g.setState("failed", "Job timed out after 30 minutes");
          await g.dispatchUpdateEvent();
        });
      }
    } catch (err) {
      log.error(err as Error);

      await step.do("mark-failed", async () => {
        const g = await EntVideoGeneration.fromID(generationId);
        await g.setState("failed", (err as Error).message);
        await g.dispatchUpdateEvent();
      });
    }
  }
}
