import { EntProduct } from "@core/domain/product";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";

const updateProductParamsSchema = z.object({
  id: z.string(),
});

export const updateProductRoute = new Hono<ApiEnv>().patch(
  "/:id",
  zValidator("param", updateProductParamsSchema),
  zValidator("json", EntProduct.Schemas().update),
  async (c) => {
    const { id } = c.req.valid("param");
    const updateData = c.req.valid("json");

    const product = await EntProduct.fromID(id);
    await product.update(updateData);
    return c.json({ product: product.toJSON() });
  },
);
