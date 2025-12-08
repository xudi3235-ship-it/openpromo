import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";
import { ContentLayout } from "@/components/content/content-layout";

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
  component: ContentLayout,
});
