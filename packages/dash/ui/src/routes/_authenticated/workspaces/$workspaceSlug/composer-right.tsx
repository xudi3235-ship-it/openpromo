import { Button } from "@openpromo/ui/components/button";
import { FBFeedPreview } from "@/components/composer/fb-feed-preview";
import { IGFeedPreview } from "@/components/composer/ig-feed-preview";
import { useComposerStore } from "@/stores/composer-store";

export function ComposerRight() {
  const { selectedPreview, setSelectedPreview } = useComposerStore();

  return (
    <div className="flex-1 p-6 bg-card border-l">
      <div className="max-w-md mx-auto space-y-4">
        {/* Preview Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Preview</h3>
          <div className="flex rounded-lg border">
            <Button
              variant={selectedPreview === "FACEBOOK" ? "default" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setSelectedPreview("FACEBOOK")}
            >
              <div className="w-4 h-4 bg-blue-600 rounded mr-2"></div>
              Facebook
            </Button>
            <Button
              variant={selectedPreview === "INSTAGRAM" ? "default" : "ghost"}
              size="sm"
              className="rounded-l-none border-l"
              onClick={() => setSelectedPreview("INSTAGRAM")}
            >
              <div className="w-4 h-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded mr-2"></div>
              Instagram
            </Button>
          </div>
        </div>

        {/* Platform Previews */}
        <div className="space-y-4">
          {selectedPreview === "FACEBOOK" && <FBFeedPreview />}
          {selectedPreview === "INSTAGRAM" && <IGFeedPreview />}
        </div>
      </div>
    </div>
  );
}
