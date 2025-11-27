// Use orval generated client and Zod schemas

import { Actor } from "@core/helpers/actor";
import { jobsClient } from "@core/rpc";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import {
  AgentOutputStatus,
  type AgentVideoGenOutput,
  JobFunction,
  JobStatus,
} from "@shared/gen/jobs/v1/jobs_pb";
import * as z from "zod";
import { orpcBuilder } from "../context";
import { withWorkspaceRole } from "../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../shared/workspace-helpers";

const DEFAULT_MAX_TURNS = 100;

const submitVideoJobInput = createWorkspaceInputSchema(
  z.object({
    product: z.string().min(1, "Product context is required"),
    productImages: z
      .array(z.string().url("Product image must be a valid URL"))
      .min(1, "Provide at least one product image"),
    avatarImages: z
      .array(z.string().url("Avatar image must be a valid URL"))
      .default([]),
    business: z.string().min(1, "Business context is required"),
    userMessage: z.string().min(1, "Please provide generation instructions"),
    maxTurns: z.number().int().min(1).max(200).default(DEFAULT_MAX_TURNS),
    jobId: z.string().optional(),
  }),
);

const pollVideoJobInput = createWorkspaceInputSchema(
  z.object({
    callId: z.string().min(1, "callId is required"),
  }),
);

// Map video gen output to a clean response shape
const mapVideoGenOutput = (out: AgentVideoGenOutput | undefined) => {
  if (!out) {
    return null;
  }

  const base = {
    status: out.status,
    statusLabel: AgentOutputStatus[out.status],
  };

  if (out.data.case === "success") {
    return {
      ...base,
      kind: "success" as const,
      videoUrl: out.data.value.videoUrl,
      summary: out.data.value.summary,
    };
  }

  if (out.data.case === "error") {
    return {
      ...base,
      kind: "error" as const,
      error: {
        message: out.data.value.errorMessage,
        type: out.data.value.errorType,
      },
    };
  }

  return { ...base, kind: "unknown" as const };
};

export const submitVideoJob = orpcBuilder
  .input(submitVideoJobInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const {
      product,
      productImages,
      avatarImages,
      business,
      userMessage,
      maxTurns,
    } = input;

    const workspaceId = Actor.workspaceID();

    const response = await jobsClient.submitAgentVideoJob({
      product,
      productImgs: productImages,
      avatarImgs: avatarImages ?? [],
      business,
      userMessage,
      maxTurns,
      workspaceId,
    });

    return {
      callId: response.callId,
    };
  });

export const getVideoJobResult = orpcBuilder
  .input(pollVideoJobInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const { callId } = input;

    const response = await jobsClient.getJobResult({ callId });

    if (response.result.case !== "videoGenResult") {
      throw new Error(`Unexpected result type: ${response.result.case}`);
    }

    return {
      callId,
      fn: response.fn,
      fnLabel: JobFunction[response.fn],
      status: response.status,
      statusLabel: JobStatus[response.status],
      error: response.error ?? null,
      videoGen: mapVideoGenOutput(response.result.value.out),
    };
  });

export const videoGenRouter = {
  submit: submitVideoJob,
  status: getVideoJobResult,
};

export type VideoGenRouterOutputs = InferRouterOutputs<typeof videoGenRouter>;
export type VideoGenRouterInputs = InferRouterInputs<typeof videoGenRouter>;
