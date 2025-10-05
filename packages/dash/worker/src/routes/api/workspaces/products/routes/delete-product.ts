import { EntProduct } from "@core/domain/product";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";

const deleteProductParamsSchema = z.object({
  id: z.string(),
});

export const deleteProductRoute = new Hono<ApiEnv>().delete(
  "/:id",
  zValidator("param", deleteProductParamsSchema),
  async (c) => {
    const { id } = c.req.valid("param");

    const product = await EntProduct.fromID(id);
    await product.delete();
    return c.json({ success: true });
  },
);
