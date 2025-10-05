import { EntProduct } from "@core/domain/product";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";

const listProductsQuerySchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().max(100).default(20),
  search: z.string().min(1).max(200).optional(),
  category: z.string().optional(),
  source: z
    .enum(["MANUAL", "AMAZON", "SHOPIFY", "ETSY", "CUSTOM_URL"])
    .optional(),
});

export const listProductsRoute = new Hono<ApiEnv>().get(
  "/",
  zValidator("query", listProductsQuerySchema),
  async (c) => {
    const queryParams = c.req.valid("query");

    const result = await EntProduct.list(queryParams);

    return c.json({
      products: result.products.map((p) => p.toJSON()),
      pagination: result.pagination,
    });
  },
);
