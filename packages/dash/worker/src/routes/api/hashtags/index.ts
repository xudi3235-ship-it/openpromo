import { HashtagService } from "@core/domain/hashtag";
import type { ApiEnv } from "@core/helpers/api-env";
import type { HashtagSearchResponse } from "@shared/hashtags";
import { Hono } from "hono";
import { z } from "zod";
import { withAuth } from "../../../middleware/with-auth";
import { zValidator } from "../../../middleware/zod-validator";

const hashtagService = new HashtagService();

const searchQuerySchema = z.object({
  q: z.string().min(1),
});

export const hashtagsRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/search", zValidator("query", searchQuerySchema), async (ctx) => {
    const { q } = ctx.req.valid("query");

    const { suggestions, stale } = await hashtagService.search(q);
    const response: HashtagSearchResponse = {
      query: q,
      suggestions,
      stale,
    };

    return ctx.json(response);
  });
