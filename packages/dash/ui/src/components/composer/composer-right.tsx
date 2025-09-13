import { Button } from "@openpromo/ui/components/button";
import { Grid3X3, List } from "lucide-react";
import { useState } from "react";
import { FBFeedPreview } from "@/components/composer/fb-feed-preview";
import { IGFeedPreview } from "@/components/composer/ig-feed-preview";
import { useComposerStore } from "@/stores/composer-store";

type ViewMode = "collage" | "list";

export function ComposerRight() {
  const { selectedPreview, setSelectedPreview } = useComposerStore();
  const [viewMode, setViewMode] = useState<ViewMode>("collage");

  return (
    <div className="flex-1 p-4 bg-background border-l">
      <div className="space-y-4">
        {/* Preview Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Preview</h3>
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border">
            <Button
              variant={viewMode === "collage" ? "default" : "ghost"}
              size="sm"
              className="rounded-r-none h-8 px-2"
              onClick={() => setViewMode("collage")}
              title="Collage view"
            >
              <Grid3X3 className="w-3 h-3" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-l-none h-8 px-2"
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <List className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Platform Previews */}
        {viewMode === "collage" ? (
          /* Collage View - Show both platforms */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="w-3 h-3 bg-blue-600 rounded"></div>
                <span className="text-xs text-muted-foreground">Facebook</span>
              </div>
              <FBFeedPreview />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="w-3 h-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded"></div>
                <span className="text-xs text-muted-foreground">Instagram</span>
              </div>
              <IGFeedPreview />
            </div>
          </div>
        ) : (
          /* List View - Show selected platform */
          <div className="max-w-md mx-auto space-y-4">
            {/* Platform Selector in center */}
            <div className="flex justify-center">
              <div className="flex gap-2">
                <Button
                  variant={
                    selectedPreview === "FACEBOOK" ? "default" : "outline"
                  }
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setSelectedPreview("FACEBOOK")}
                >
                  <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
                  <span className="text-xs">Facebook</span>
                </Button>
                <Button
                  variant={
                    selectedPreview === "INSTAGRAM" ? "default" : "outline"
                  }
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setSelectedPreview("INSTAGRAM")}
                >
                  <div className="w-3 h-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded mr-2"></div>
                  <span className="text-xs">Instagram</span>
                </Button>
              </div>
            </div>

            {/* Preview */}
            <div>
              {selectedPreview === "FACEBOOK" && <FBFeedPreview />}
              {selectedPreview === "INSTAGRAM" && <IGFeedPreview />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
