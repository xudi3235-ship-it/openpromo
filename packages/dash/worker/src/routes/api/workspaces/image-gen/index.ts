import { ProductImageGen } from "@core/domain/genai";
import { EntImageGeneration } from "@core/domain/image-generation";
import { EntProduct } from "@core/domain/product";
import { EntStyleComponent } from "@core/domain/style-component";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { AppError } from "../../../../helpers/error";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";

const generateImageSchema = z.object({
  productId: z.string(),
  styleId: z.string().optional(),
});

export const imageGenRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_editor"))
  .post("/generate", zValidator("json", generateImageSchema), async (c) => {
    const { productId, styleId } = c.req.valid("json");

    const product = await EntProduct.fromID(productId);

    let styleComponent: EntStyleComponent;
    let promptOverride: string | undefined;

    if (styleId) {
      styleComponent = await EntStyleComponent.fromID(styleId);
    } else {
      const officialStyles = await EntStyleComponent.listOfficial();

      if (officialStyles.length === 0) {
        throw new AppError(404, {
          message: "No styles available",
          userMessage:
            "No official styles exist yet. Create a style before generating images.",
        });
      }

      const match = await ProductImageGen.matchProductWithStyles(
        product,
        officialStyles,
      );
      styleComponent = match.style;
      promptOverride = match.prompt;
    }

    const styleInput: ProductImageGen.ImageStyleInput = {
      imageGenPrompt: promptOverride ?? styleComponent.data.imageGenPrompt,
      imageRefs: styleComponent.data.imageRefs,
      name: styleComponent.data.slug,
      description: styleComponent.data.description,
    };

    const generationResult = await ProductImageGen.genImage({
      product,
      style: styleInput,
    });

    const generation = await EntImageGeneration.create({
      workspaceId: product.data.workspaceId,
      styleComponentId: styleComponent.data.id,
      productId: product.data.id,
      prompt: generationResult.prompt,
      negativePrompt: generationResult.negativePrompt,
      outputImages: generationResult.imageUrls,
      metadata: {},
      context: {},
    });

    const [imageUrl] = generationResult.imageUrls;

    return c.json({
      imageUrl,
      generation: generation.toJSON(),
    });
  });
