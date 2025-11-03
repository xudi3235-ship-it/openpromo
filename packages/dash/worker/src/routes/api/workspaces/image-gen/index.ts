import { EntImageGeneration } from "@core/domain/image-generation";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { Binding } from "@core/helpers/api-env";
import { env } from "@core/utils/env";
import { Hono } from "hono";
import * as z from "zod";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";

const generateImageSchema = z.object({
  productId: z.string(),
  styleId: z.string().optional(),
  referenceImageUrl: z.string().optional(),
  mode: z.enum(["studio", "style"]).optional().default("studio"),
  batchCount: z.coerce.number().min(1).max(4).optional().default(1),
  prompt: z.string().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().max(50).default(20),
  productId: z.string().optional(),
});

const deleteBatchSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const imageGenRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_editor"))
  .get("/", zValidator("query", listQuerySchema), async (c) => {
    const { page, pageSize, productId } = c.req.valid("query");

    const result = await EntImageGeneration.list({
      page,
      pageSize,
      productId,
    });

    return c.json({
      generations: result.generations.map((generation) => generation.toJSON()),
      pagination: result.pagination,
    });
  })
  .post("/delete-batch", zValidator("json", deleteBatchSchema), async (c) => {
    const { ids } = c.req.valid("json");

    const result = await EntImageGeneration.deleteBatch(ids);

    return c.json(result);
  })
  .post("/generate", zValidator("json", generateImageSchema), async (c) => {
    const { productId, mode, batchCount, prompt, referenceImageUrl, styleId } =
      c.req.valid("json");

    // Check if we should use async workflow or sync generation
    const isLocal = env.VITE_ENVIRONMENT === "local";
    const useAsyncWorkflow = !isLocal;

    if (useAsyncWorkflow) {
      // ====== ASYNC MODE (Production) ======
      // Create generation records and trigger workflows
      // Returns immediately, updates come via WebSocket

      const generationPromises = Array.from(
        { length: batchCount },
        async () => {
          // Create generation record in pending state
          const generation = await EntImageGeneration.create({
            state: "pending",
            productId,
            styleComponentId: styleId ?? null,
            metadata: {
              mode,
              prompt,
              referenceImageUrl,
            },
          });

          // Dispatch initial event
          await generation.dispatchUpdateEvent();

          // Trigger workflow (fire and forget)
          const actor = Actor.use();
          if (actor.type !== "workspace_user") {
            throw new Error("Actor must be workspace_user to trigger workflow");
          }

          await Binding.use().ImageGenerationWorkflow.create({
            params: {
              actor,
              generationId: generation.data.id,
            },
          });

          return generation;
        },
      );

      const generations = await Promise.all(generationPromises);

      return c.json({
        async: true,
        results: generations.map((generation) => ({
          generationId: generation.data.id,
          state: generation.data.state,
          generation: generation.toJSON(),
        })),
      });
    }

    // ====== SYNC MODE (Local Development) ======
    // Block until generation completes, return images immediately

    if (mode === "studio") {
      // Studio shot: clean background, no style reference
      const generations = await Promise.all(
        Array.from({ length: batchCount }, () =>
          EntImageGeneration.generateStudioBackgroundImage(productId, prompt),
        ),
      );

      return c.json({
        async: false,
        results: generations.map((generation) => ({
          imageUrl: generation.data.outputImages[0],
          generation: generation.toJSON(),
        })),
      });
    }

    // generate style with reference image
    const generations = await Promise.all(
      Array.from({ length: batchCount }, () =>
        EntImageGeneration.generateProductImageWithReference({
          productId,
          referenceImageUrl: referenceImageUrl as string,
          prompt: prompt ?? "",
          styleId,
        }),
      ),
    );

    return c.json({
      async: false,
      results: generations.map((gen) => ({
        imageUrl: gen.data.outputImages[0],
        generation: gen.toJSON(),
      })),
    });
  });
