import { EntProduct } from "@core/domain/product";
import type { ApiEnv } from "@core/helpers/api-env";
import { ProductListQuerySchema } from "@shared/product";
import { Hono } from "hono";
import { zValidator } from "../../../../../middleware/zod-validator";

export const listProductsRoute = new Hono<ApiEnv>().get(
  "/",
  zValidator("query", ProductListQuerySchema),
  async (c) => {
    const queryParams = c.req.valid("query");

    const result = await EntProduct.list(queryParams);

    return c.json({
      products: result.products.map((p) => p.toJSON()),
      pagination: result.pagination,
    });
  },
);
