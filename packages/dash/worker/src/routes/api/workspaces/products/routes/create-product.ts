import { EntProduct } from "@core/domain/product";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import type { z } from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";

const CreateProductSchema = EntProduct.Schemas().create;
type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const createProductRoute = new Hono<ApiEnv>().post(
  "/",
  zValidator("json", CreateProductSchema),
  async (c) => {
    const productData = c.req.valid("json") as CreateProductInput;

    const product = await EntProduct.create(productData);

    return c.json({ product: product.toJSON() });
  },
);
