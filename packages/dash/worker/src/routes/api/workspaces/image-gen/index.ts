import { ProductImageGen } from "@core/domain/genai";
import { allStyleComponents } from "@core/domain/genai/styles";
import { EntProduct } from "@core/domain/product";
import type { ApiEnv } from "@core/helpers/api-env";
import { StyleName } from "@shared/product";
import { Hono } from "hono";
import * as z from "zod";
import { AppError } from "../../../../helpers/error";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";

const generateImageSchema = z.object({
  productId: z.string(),
  styleName: StyleName.optional(),
});

export const imageGenRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_editor"))
  .post("/generate", zValidator("json", generateImageSchema), async (c) => {
    const { productId, styleName } = c.req.valid("json");

    const product = await EntProduct.fromID(productId);

    const style =
      styleName !== undefined
        ? allStyleComponents.get(styleName)
        : await ProductImageGen.matchProductWithStyles(product);

    if (!style)
      throw new AppError(404, {
        message: `Style not found for name: ${styleName}`,
        userMessage: "Image style not found.",
      });

    const imageUrl = await ProductImageGen.genImage({ product, style });

    return c.json({
      imageUrl,
    });
  });
