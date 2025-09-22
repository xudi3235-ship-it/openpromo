import type { Platform } from "@core/schemas/connected-account.sql";
import { Button } from "@openpromo/ui/components/button";

interface PlatformSelectorProps {
  selectedPreview: Platform;
  onSelectPreview: (platform: Platform) => void;
  showFacebook: boolean;
  showInstagram: boolean;
}

export function PlatformSelector({
  selectedPreview,
  onSelectPreview,
  showFacebook,
  showInstagram,
}: PlatformSelectorProps) {
  return (
    <div className="flex justify-center">
      <div className="flex gap-2">
        {showFacebook && (
          <Button
            variant={selectedPreview === "FACEBOOK" ? "default" : "outline"}
            size="sm"
            className="h-8 px-3"
            onClick={() => onSelectPreview("FACEBOOK")}
          >
            <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
            <span className="text-xs">Facebook</span>
          </Button>
        )}
        {showInstagram && (
          <Button
            variant={selectedPreview === "INSTAGRAM" ? "default" : "outline"}
            size="sm"
            className="h-8 px-3"
            onClick={() => onSelectPreview("INSTAGRAM")}
          >
            <div className="w-3 h-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded mr-2"></div>
            <span className="text-xs">Instagram</span>
          </Button>
        )}
      </div>
    </div>
  );
}
