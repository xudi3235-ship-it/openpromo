import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Separator } from "@openpromo/ui/components/separator";
import type { InboxConversationSummary } from "@shared/inbox";
import {
  ExternalLink,
  Eye,
  MessageSquare,
  Share2,
  ThumbsUp,
} from "lucide-react";

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
              {/* Post Image/Video */}
              {postPreview.attachments &&
                postPreview.attachments.length > 0 && (
                  <div className="overflow-hidden rounded-lg border border-border/60">
                    {postPreview.attachments[0].type === "photo" ? (
                      <img
                        src={postPreview.attachments[0].publicUrl}
                        alt="Post content"
                        className="h-auto w-full object-cover"
                      />
                    ) : postPreview.attachments[0].type === "video" ? (
                      <video
                        src={postPreview.attachments[0].publicUrl}
                        poster={
                          postPreview.attachments[0].thumbnailUrl ?? undefined
                        }
                        controls
                        className="h-auto w-full"
                      />
                    ) : null}
                  </div>
                )}

              {/* Caption */}
              {postPreview.caption && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Caption
                  </p>
                  <p className="text-sm leading-relaxed line-clamp-4">
                    {postPreview.caption}
                  </p>
                </div>
              )}

              {/* Engagement Metrics */}
              {postPreview.metrics && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {postPreview.metrics.likes !== null &&
                    postPreview.metrics.likes !== undefined && (
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        <span>
                          {postPreview.metrics.likes.toLocaleString()}
                        </span>
                      </div>
                    )}
                  {postPreview.metrics.comments !== null &&
                    postPreview.metrics.comments !== undefined && (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>
                          {postPreview.metrics.comments.toLocaleString()}
                        </span>
                      </div>
                    )}
                  {postPreview.metrics.shares !== null &&
                    postPreview.metrics.shares !== undefined && (
                      <div className="flex items-center gap-1">
                        <Share2 className="h-3 w-3" />
                        <span>
                          {postPreview.metrics.shares.toLocaleString()}
                        </span>
                      </div>
                    )}
                </div>
              )}

              {/* Permalink */}
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

        <Separator />

        {/* Comment Thread Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Thread Info</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Thread ID:</span>
              <span className="font-mono text-xs">
                {conversation.externalThreadId?.slice(0, 12)}...
              </span>
            </div>
            {conversation.contentId && (
              <div className="flex justify-between">
                <span>Content ID:</span>
                <span className="font-mono text-xs">
                  {conversation.contentId.slice(0, 12)}...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
