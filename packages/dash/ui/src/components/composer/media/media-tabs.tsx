import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import { Upload } from "lucide-react";
import { useState } from "react";
import { RiSparklingFill } from "react-icons/ri";
import { MediaGenerateContent } from "./media-generate-content";
import { MediaSectionContent } from "./media-section-content";

/**
 * MediaTabs - Wrapper for Upload and Instant Ad views with ghost button toggle
 * Provides seamless switching between traditional file upload and AI generation
 */
export function MediaTabs() {
  const [activeTab, setActiveTab] = useState<"upload" | "instant-ad">("upload");

  return (
    <div className="space-y-4">
      {/* Ghost Button Toggle */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab("upload")}
          className={cn("gap-2", activeTab === "upload" && "bg-muted")}
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab("instant-ad")}
          className={cn("gap-2", activeTab === "instant-ad" && "bg-muted")}
        >
          <RiSparklingFill className="h-3.5 w-3.5" />
          Instant Ad
        </Button>
      </div>

      {/* Content */}
      {activeTab === "upload" ? (
        <MediaSectionContent />
      ) : (
        <MediaGenerateContent />
      )}
    </div>
  );
}
