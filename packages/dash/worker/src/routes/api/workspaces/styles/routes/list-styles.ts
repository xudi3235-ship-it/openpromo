import { EntStyleComponent } from "@core/domain/style-component";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";

const listStylesQuerySchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().max(10).default(10),
  search: z.string().min(1).max(200).optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const listStylesRoute = new Hono<ApiEnv>().get(
  "/",
  zValidator("query", listStylesQuerySchema),
  async (c) => {
    const queryParams = c.req.valid("query");

    const result = await EntStyleComponent.list(queryParams);

    return c.json({
      styles: result.styles.map((style) => style.toJSON()),
      pagination: result.pagination,
    });
  },
);
