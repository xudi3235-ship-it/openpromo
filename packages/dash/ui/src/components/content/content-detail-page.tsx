import { Button } from "@openpromo/ui/components/button";
import { Surface } from "@openpromo/ui/components/surface";
import { Caption, Text } from "@openpromo/ui/components/typography";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useContentDetailQuery } from "@/queries/content-orpc";
import { Route } from "@/routes/_authenticated/workspaces/$workspaceSlug/content/$contentId";
import { ContentDetailActions } from "./detail/ContentDetailActions";
import { ContentDetailHeader } from "./detail/ContentDetailHeader";
import { ContentDetailMetrics } from "./detail/ContentDetailMetrics";
import { ContentDetailSkeleton } from "./detail/ContentDetailSkeleton";

export function ContentDetailPage() {
  const navigate = useNavigate();
  const { contentId, workspaceSlug } = Route.useParams();
  const { data, isPending, error } = useContentDetailQuery(contentId);

  const handleBack = () => {
    navigate({
      to: "/workspaces/$workspaceSlug/content",
      params: { workspaceSlug },
    });
  };

  if (isPending) {
    return <ContentDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Surface padded="lg" tone="ghost">
          <Text weight="semibold">Unable to load content details</Text>
          <Caption tone="muted">{error.message}</Caption>
        </Surface>
      </div>
    );
  }

  const content = data?.content;

  if (!content) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Surface padded="lg" tone="ghost">
          <Text weight="semibold">Content not found</Text>
          <Caption tone="muted">
            The requested content may have been deleted.
          </Caption>
        </Surface>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-4 px-4 py-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Content
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 px-4 pb-8 lg:grid-cols-3">
        {/* Left: Preview & Basic Info */}
        <div className="lg:col-span-2 space-y-6">
          <ContentDetailHeader
            content={content}
            connectedAccountId={content.connectedAccountId}
          />
        </div>

        {/* Right: Metrics & Actions */}
        <div className="space-y-6">
          <ContentDetailMetrics
            metrics={content.metrics}
            refreshedAt={content.metricsRefreshedAt}
          />
          <ContentDetailActions content={content} />
        </div>
      </div>
    </div>
  );
}
