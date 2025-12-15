import type { UnifiedContentSelect } from "@core/schemas/content.sql";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { ContentDetailActions } from "@/components/content/detail/ContentDetailActions";
import { ContentDetailHeader } from "@/components/content/detail/ContentDetailHeader";
import { ContentDetailMetrics } from "@/components/content/detail/ContentDetailMetrics";

type CalendarContentDetailModalProps = {
  content: UnifiedContentSelect;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CalendarContentDetailModal({
  content,
  open,
  onOpenChange,
}: CalendarContentDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Content Details</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
      </DialogContent>
    </Dialog>
  );
}
