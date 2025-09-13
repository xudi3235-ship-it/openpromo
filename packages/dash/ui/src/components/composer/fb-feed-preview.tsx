import { Button } from "@openpromo/ui/components/button";
import { Card, CardContent } from "@openpromo/ui/components/card";
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
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerStore } from "@/stores/composer";

export function FBFeedPreview() {
  const { workspace } = useWorkspace();
  const { contentCreateDataDerived, draft } = useComposerStore((s) => ({
    contentCreateDataDerived: s.contentCreateDataDerived,
    draft: s.draft,
  }));
  const attachments = contentCreateDataDerived.base.attachments;
  // Pick first facebook placement to show override if present
  const fbPlacement = contentCreateDataDerived.placements.facebookFeed?.[0];
  const message = fbPlacement?.postSpec.message || draft.message;

  return (
    <Card>
      <CardContent className="p-4">
        {/* Post Header */}
        <div className="flex items-start space-x-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-sm">
                    {workspace?.name || "Your Business Page"}
                  </h4>
                </div>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <span>2 hours ago</span>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>San Francisco, CA</span>
                  </div>
                  <span>•</span>
                  <Globe className="w-3 h-3" />
                </div>
              </div>
              <Button variant="ghost" size="sm" className="p-1">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Post Message */}
        <div className="mb-3 whitespace-pre-wrap text-sm">
          {message || (
            <span className="text-muted-foreground">
              Start typing your post...
            </span>
          )}
        </div>

        {/* Post Content (media) */}
        <div className="mb-4">
          {attachments.length > 0 && attachments[0]?.file ? (
            <div className="w-full rounded-lg overflow-hidden">
              {attachments[0].file.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(attachments[0].file)}
                  alt="Preview"
                  className="w-full h-64 object-cover"
                />
              ) : attachments[0].file.type.startsWith("video/") ? (
                <video
                  src={URL.createObjectURL(attachments[0].file)}
                  className="w-full h-64 object-cover"
                  controls
                >
                  <track kind="captions" label="auto-generated" />
                </video>
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
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="flex -space-x-1">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <ThumbsUp className="w-2 h-2 text-white" />
                </div>
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                  <Heart className="w-2 h-2 text-white" />
                </div>
              </div>
              <span>142 reactions</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span>23 comments</span>
            <span>8 shares</span>
          </div>
        </div>

        {/* Post Actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-muted-foreground hover:text-foreground"
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            Like
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-muted-foreground hover:text-foreground"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Comment
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-muted-foreground hover:text-foreground"
          >
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
