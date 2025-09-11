import { Button } from "@openpromo/ui/components/button";
import { Card, CardContent } from "@openpromo/ui/components/card";
import { Image, Users } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerStore } from "@/stores/composer-store";

export function FBFeedPreview() {
  const { workspace } = useWorkspace();
  const { placementSpecs } = useComposerStore();
  const attachments = placementSpecs.base.attachments;

  return (
    <Card>
      <CardContent className="p-4">
        {/* Post Header */}
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold text-sm">
                {workspace?.name || "Your Page"}
              </h4>
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <span>Just now</span>
              <span>•</span>
              <Users className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Post Content */}
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
                />
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

        {/* Post Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" size="sm" className="flex-1">
            👍 Like
          </Button>
          <Button variant="ghost" size="sm" className="flex-1">
            💬 Comment
          </Button>
          <Button variant="ghost" size="sm" className="flex-1">
            📤 Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
