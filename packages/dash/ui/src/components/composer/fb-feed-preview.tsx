import { Button } from "@openpromo/ui/components/button";
import {
  Globe,
  Heart,
  Image,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Share,
  ThumbsUp,
} from "lucide-react";
import { useAttachmentRenderer } from "@/hooks/useAttachmentRenderer";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerStore } from "@/stores/composer-store";

export function FBFeedPreview() {
  const { workspace } = useWorkspace();
  const contentCreateData = useComposerStore((s) => s.contentCreateData);
  const { getAttachmentUrl, renderAttachment } = useAttachmentRenderer();
  const attachments = contentCreateData.base.attachments ?? [];
  const message = contentCreateData.base.message;

  return (
    <div className="border rounded-lg p-3 bg-background">
      {/* Post Header */}
      <div className="flex items-start space-x-3 mb-3">
        <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-semibold text-sm truncate">
                  {workspace?.name || "Your Business Page"}
                </h4>
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <span>2 hours ago</span>
                <span>•</span>
                <div className="flex items-center space-x-1 min-w-0">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">San Francisco, CA</span>
                </div>
                <span>•</span>
                <Globe className="w-3 h-3 flex-shrink-0" />
              </div>
            </div>
            <Button variant="ghost" size="sm" className="p-1">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Post Message */}
      <div className="mb-3 whitespace-pre-wrap text-sm break-words">
        {message || (
          <span className="text-muted-foreground">
            Start typing your post...
          </span>
        )}
      </div>

      {/* Post Content (media) */}
      <div className="mb-4">
        {!!attachments && attachments.length > 0 ? (
          <div className="w-full rounded-lg overflow-hidden">
            {attachments.length === 1 && attachments[0] ? (
              // Single attachment - full width
              renderAttachment(attachments[0], "w-full h-64 object-cover", true)
            ) : attachments.length === 2 ? (
              // Two attachments - side by side
              <div className="grid grid-cols-2 gap-1 h-64">
                {attachments.slice(0, 2).map(
                  (attachment, index) =>
                    attachment &&
                    getAttachmentUrl(attachment) && (
                      <div
                        key={attachment.id || `attachment-${index}`}
                        className="w-full h-full"
                      >
                        {renderAttachment(attachment)}
                      </div>
                    ),
                )}
              </div>
            ) : attachments.length === 3 ? (
              // Three attachments - large left, two stacked right
              <div className="grid grid-cols-2 gap-1 h-64">
                {attachments[0] && getAttachmentUrl(attachments[0]) && (
                  <div className="w-full h-full">
                    {renderAttachment(attachments[0])}
                  </div>
                )}
                <div className="grid grid-rows-2 gap-1 h-full">
                  {attachments.slice(1, 3).map(
                    (attachment, index) =>
                      attachment &&
                      getAttachmentUrl(attachment) && (
                        <div
                          key={attachment.id || `attachment-${index + 1}`}
                          className="w-full h-full"
                        >
                          {renderAttachment(attachment)}
                        </div>
                      ),
                  )}
                </div>
              </div>
            ) : attachments.length >= 4 ? (
              // Four or more attachments - 2x2 grid with "+X more" overlay
              <div className="grid grid-cols-2 gap-1 h-64">
                {attachments.slice(0, 3).map(
                  (attachment, index) =>
                    attachment &&
                    getAttachmentUrl(attachment) && (
                      <div
                        key={attachment.id || `attachment-${index}`}
                        className="w-full h-full"
                      >
                        {renderAttachment(attachment)}
                      </div>
                    ),
                )}
                {/* Fourth attachment with overlay */}
                {attachments[3] && getAttachmentUrl(attachments[3]) && (
                  <div className="relative w-full h-full">
                    {renderAttachment(attachments[3])}
                    {attachments.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          +{attachments.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Image className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">Media preview will appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Engagement Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 min-w-0">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className="flex items-center space-x-1 min-w-0">
            <div className="flex -space-x-1 flex-shrink-0">
              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                <ThumbsUp className="w-2 h-2 text-white" />
              </div>
              <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                <Heart className="w-2 h-2 text-white" />
              </div>
            </div>
            <span className="truncate">142 reactions</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className="whitespace-nowrap">23 comments</span>
          <span className="whitespace-nowrap">8 shares</span>
        </div>
      </div>

      {/* Post Actions */}
      <div className="flex items-center pt-3 border-t min-w-0">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-muted-foreground hover:text-foreground min-w-0"
        >
          <ThumbsUp className="w-4 h-4 mr-1 flex-shrink-0" />
          <span className="truncate">Like</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-muted-foreground hover:text-foreground min-w-0"
        >
          <MessageCircle className="w-4 h-4 mr-1 flex-shrink-0" />
          <span className="truncate">Comment</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-muted-foreground hover:text-foreground min-w-0"
        >
          <Share className="w-4 h-4 mr-1 flex-shrink-0" />
          <span className="truncate">Share</span>
        </Button>
      </div>
    </div>
  );
}
