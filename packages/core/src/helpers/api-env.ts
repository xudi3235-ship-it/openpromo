import type { ContainerBackend } from "@core/containers";
import type { VideoGenAgent } from "@core/domain/agents/video-gen-agent";
import type { ContentBackfillWorkflowParams } from "@core/domain/content/workflows/content-backfill-workflow";
import type { PublishWorkflowParams } from "@core/domain/content/workflows/content-publish-workflow";
import type { ImageGenerationWorkflowParams } from "@core/domain/image-generation";
import type { ProductProcessingWorkflowParams } from "@core/domain/product/workflows/product-processing-workflow";
import type { StyleComponentWorkflowParams } from "@core/domain/style-component";
import type { VideoGenerationWorkflowParams } from "@core/domain/video-generation";
import type {
  ApiRateLimitCoordinator,
  WorkspacePusher,
  WorkspaceSyncCoordinator,
} from "@core/durable-objects";
import type { JobQueueMessage } from "@core/queues/job-queue";
import { createContext } from "@core/utils/context";
import type { env as runtimeEnvVars } from "@core/utils/env";
import type { OrganizationRole } from "@shared/workspace/auth";
import type { User } from "@workos-inc/node";
import type { AgentNamespace } from "agents";

export type ApiEnv = {
  Variables: {
    user: User | undefined;
    organizationId: string | undefined;
    role: OrganizationRole | undefined;
    featureFlags: string[];
    permissions: string[];
  };
  Bindings: typeof runtimeEnvVars & {
    HYPERDRIVE: Hyperdrive;
    // workflows
    WORKFLOW: Workflow<PublishWorkflowParams>;
    ContentBackfillWorkflow: Workflow<ContentBackfillWorkflowParams>;
    ProductProcessingWorkflow: Workflow<ProductProcessingWorkflowParams>;
    StyleComponentWorkflow: Workflow<StyleComponentWorkflowParams>;
    ImageGenerationWorkflow: Workflow<ImageGenerationWorkflowParams>;
    VideoGenerationWorkflow: Workflow<VideoGenerationWorkflowParams>;
    // durable objects
    WorkspacePusher: DurableObjectNamespace<WorkspacePusher>;
    WorkspaceSyncCoordinator: DurableObjectNamespace<WorkspaceSyncCoordinator>;
    ApiRateLimitCoordinator: DurableObjectNamespace<ApiRateLimitCoordinator>;
    ContainerBackend: DurableObjectNamespace<ContainerBackend>;
    // storage
    Bucket: R2Bucket;
    KV: KVNamespace;
    JobQueue: Queue<JobQueueMessage>;
    // analytics
    WorkspaceInsightsAnalytics: AnalyticsEngineDataset;
    // agents
    VideoGenAgent: AgentNamespace<VideoGenAgent>;
  };
};

export type Bindings = ApiEnv["Bindings"];

export namespace Binding {
  export const Context = createContext<Bindings>();
  export function use(): Bindings {
    try {
      return Context.use();
    } catch {
      throw new Error("No runtime bindings found in context");
    }
  }
  export function provide<
    T extends Bindings,
    // biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
    Next extends (...args: any) => any,
  >(bindings: T, fn: Next) {
    // biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
    return Context.provide(bindings as any, () => fn());
  }
}
