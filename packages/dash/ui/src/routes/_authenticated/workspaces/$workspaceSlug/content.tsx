import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";
import { ContentListPage } from "@/components/content/ContentListPage";
import { prefetchContentList } from "@/queries/content";

const contentSearchSchema = z.object({
  // Allow these params but don't use them (from calendar navigation)
  view: z.enum(["week", "month"]).optional(),
  date: z.string().optional(),
  platform: z.enum(["FACEBOOK", "INSTAGRAM", "TIKTOK"]).optional(),
  publishingStatus: z.string().optional(),
  // These might come from content page navigation
  q: z.string().optional(),
  search: z.string().optional(),
});

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/content",
)({
  validateSearch: contentSearchSchema,
  loader: ({ params, context }) => {
    // Prefetch content list with default params to avoid query waterfall
    prefetchContentList(context.queryClient, params.workspaceSlug);
  },
  component: ContentListPage,
});
