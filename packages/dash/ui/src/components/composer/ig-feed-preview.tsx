import { Button } from "@openpromo/ui/components/button";
import { Card, CardContent } from "@openpromo/ui/components/card";
import {
  Bookmark,
  Heart,
  Image,
  MessageCircle,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerStore } from "@/stores/composer-store";

export function IGFeedPreview() {
  const { workspace } = useWorkspace();
  const contentCreateData = useComposerStore((s) => s.contentCreateData);
  const attachments = contentCreateData.base.attachments;
  const caption = "FIXME";

  return (
    <Card className="max-w-sm border-0 shadow-none">
      <CardContent className="p-0">
        {/* Post Header */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 p-0.5">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400"></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm">
                {workspace?.name?.toLowerCase().replace(/\s+/g, "_") ||
                  "your_business"}
              </h4>
              <p className="text-xs text-muted-foreground">
                San Francisco, California
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="p-1">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Post Content */}
        <div className="aspect-square">
          {attachments.length > 0 && attachments[0]?.file ? (
            attachments[0].file.type.startsWith("image/") ? (
              <img
                src={URL.createObjectURL(attachments[0].file)}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : attachments[0].file.type.startsWith("video/") ? (
              <video
                src={URL.createObjectURL(attachments[0].file)}
                className="w-full h-full object-cover"
                controls
              />
            ) : null
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Image className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">Media preview will appear here</p>
              </div>
            </div>
          )}
        </div>

        {/* Post Actions */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="p-0 hover:bg-transparent"
              >
                <Heart className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-0 hover:bg-transparent"
              >
                <MessageCircle className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-0 hover:bg-transparent"
              >
                <Send className="w-6 h-6" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="p-0 hover:bg-transparent"
            >
              <Bookmark className="w-6 h-6" />
            </Button>
          </div>

          {/* Likes */}
          <div className="text-sm font-semibold mb-1">1,247 likes</div>

          {/* Caption */}
          <div className="text-sm mb-2 whitespace-pre-wrap">
            <span className="font-semibold">
              {workspace?.name?.toLowerCase().replace(/\s+/g, "_") ||
                "your_business"}
            </span>{" "}
            <span>
              {caption || (
                <span className="text-muted-foreground">
                  Start typing your caption...
                </span>
              )}
            </span>
          </div>

          {/* Comments preview */}
          <div className="text-sm text-muted-foreground mb-1">
            View all 89 comments
          </div>

          {/* Timestamp */}
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            2 hours ago
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
