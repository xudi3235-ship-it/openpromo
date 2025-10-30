import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Separator } from "@openpromo/ui/components/separator";
import type { InboxConversationSummary } from "@shared/inbox";
import { ExternalLink, Eye } from "lucide-react";
import { InboxContentPreview } from "@/components/inbox/inbox-content-preview";

interface InboxCommentContextProps {
  conversation: InboxConversationSummary;
}

export function InboxCommentContext({
  conversation,
}: InboxCommentContextProps) {
  const postPreview = conversation.postPreview;

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-4 p-4">
        {/* Post Preview Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Post Preview</h3>
            <Badge variant="outline" className="text-xs">
              {conversation.platform}
            </Badge>
          </div>

          {postPreview ? (
            <div className="space-y-3">
              <InboxContentPreview preview={postPreview} />

              {postPreview.permalink && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a
                    href={postPreview.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-3 w-3" />
                    View Full Post
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-6 text-center">
              <Eye className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                Post preview not available
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Quick Actions Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Quick Actions</h3>
          <div className="grid gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <Eye className="mr-2 h-3 w-3" />
              Hide Comment
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Delete Comment
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
