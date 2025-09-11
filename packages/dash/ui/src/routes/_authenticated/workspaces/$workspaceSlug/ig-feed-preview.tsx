import { Button } from "@openpromo/ui/components/button";
import { Card, CardContent } from "@openpromo/ui/components/card";
import { Heart, Image, MessageCircle, Send } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerStore } from "@/stores/composer-store";

export function IGFeedPreview() {
  const { workspace } = useWorkspace();
  const { placementSpecs } = useComposerStore();
  const attachments = placementSpecs.base.attachments;

  return (
    <Card className="max-w-sm">
      <CardContent className="p-0">
        {/* Post Header */}
        <div className="flex items-center space-x-3 p-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400"></div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm">
              {workspace?.name || "your_page"}
            </h4>
          </div>
          <Button variant="ghost" size="sm" className="p-1">
            <div className="w-1 h-1 bg-current rounded-full"></div>
            <div className="w-1 h-1 bg-current rounded-full mx-0.5"></div>
            <div className="w-1 h-1 bg-current rounded-full"></div>
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="p-1">
                <Heart className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="p-1">
                <MessageCircle className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="p-1">
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="text-sm">
            <span className="font-semibold">0 likes</span>
          </div>

          <div className="text-xs text-muted-foreground mt-1">Just now</div>
        </div>
      </CardContent>
    </Card>
  );
}
