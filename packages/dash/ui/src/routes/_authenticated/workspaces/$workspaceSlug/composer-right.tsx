import { Button } from "@openpromo/ui/components/button";
import { Card, CardContent } from "@openpromo/ui/components/card";
import { ArrowUpDown, Image, Users } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";

export function ComposerRight() {
  const { workspace } = useWorkspace();

  return (
    <div className="flex-1 p-6 bg-card border-l">
      <div className="max-w-md mx-auto">
        {/* Preview Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="font-medium">Facebook Feed preview</h3>
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex rounded-lg border">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-none"
              disabled
            >
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-none border-l"
              disabled
            >
              <div className="w-4 h-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded"></div>
            </Button>
          </div>
        </div>

        {/* Post Preview */}
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
              <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Image className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">Media preview will appear here</p>
                </div>
              </div>
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
      </div>
    </div>
  );
}
