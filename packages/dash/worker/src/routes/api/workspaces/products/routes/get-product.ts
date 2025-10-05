import { EntProduct } from "@core/domain/product";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";

const getProductParamsSchema = z.object({
  id: z.string(),
});

export const getProductRoute = new Hono<ApiEnv>().get(
  "/:id",
  zValidator("param", getProductParamsSchema),
  async (c) => {
    const { id } = c.req.valid("param");

    const product = await EntProduct.fromID(id);
    return c.json({ product: product.toJSON() });
  },
);
