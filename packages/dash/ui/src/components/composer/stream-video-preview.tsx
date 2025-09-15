import { memo } from "react";

interface StreamVideoPreviewProps {
  iframeUrl: string;
  className?: string;
  aspectRatio?: string;
}

export const StreamVideoPreview = memo(function StreamVideoPreview({
  iframeUrl,
  className = "",
  aspectRatio = "16:9",
}: StreamVideoPreviewProps) {
  // Calculate padding-top based on aspect ratio
  const getPaddingTop = (ratio: string) => {
    if (ratio === "16:9") return "56.25%";
    if (ratio === "4:3") return "75%";
    if (ratio === "1:1") return "100%";

    // Parse custom aspect ratios like "1920:1080"
    const [width, height] = ratio.split(":").map(Number);
    if (width && height) {
      return `${(height / width) * 100}%`;
    }

    return "56.25%"; // Default to 16:9
  };

  return (
    <div
      className={`relative ${className}`}
      style={{ paddingTop: getPaddingTop(aspectRatio) }}
    >
      <iframe
        src={iframeUrl}
        className="absolute inset-0 w-full h-full border-0 rounded-lg"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
        title="Video preview"
      />
    </div>
  );
});
