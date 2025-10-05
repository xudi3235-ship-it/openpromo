import { EntProduct } from "@core/domain/product";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { zValidator } from "../../../../../middleware/zod-validator";

export const createProductRoute = new Hono<ApiEnv>().post(
  "/",
  zValidator("json", EntProduct.Schemas().create),
  async (c) => {
    const productData = c.req.valid("json");

    const product = await EntProduct.create(productData);

    return c.json({ product: product.toJSON() });
  },
);
