import { Button } from "@openpromo/ui/components/button";
import { Slider } from "@openpromo/ui/components/slider";
import { Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface VideoFrameSelectorProps {
  videoFile: File;
  onSelectFrame: (thumbnailDataUrl: string) => void;
  onCancel: () => void;
}

export function VideoFrameSelector({
  videoFile,
  onSelectFrame,
  onCancel,
}: VideoFrameSelectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Create object URL for video
  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  // Handle video metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration);
    setIsVideoLoaded(true);

    // Set initial frame at 0.5 seconds (or start if video is shorter)
    const initialTime = Math.min(0.5, video.duration / 2);
    video.currentTime = initialTime;
    setCurrentTime(initialTime);
  }, []);

  // Handle video seeked (frame changed)
  const handleSeeked = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Draw current frame to canvas
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }, []);

  // Handle slider change
  const handleSliderChange = useCallback((value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = value[0];
    if (newTime !== undefined) {
      video.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);

  // Capture current frame
  const handleSelectFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onSelectFrame(dataUrl);
  }, [onSelectFrame]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Select Video Thumbnail Frame</div>

      {/* Video Preview */}
      <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden">
        {/* Hidden video element for frame extraction */}
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onSeeked={handleSeeked}
          className="absolute inset-0 w-full h-full object-contain"
          muted
          playsInline
        />

        {/* Canvas overlay showing current frame */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-contain"
        />

        {!isVideoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-sm">Loading video...</div>
          </div>
        )}
      </div>

      {/* Timeline Slider */}
      {isVideoLoaded && (
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            onValueChange={handleSliderChange}
            max={duration}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="h-8">
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSelectFrame}
          disabled={!isVideoLoaded}
          className="h-8"
        >
          <Check className="h-3.5 w-3.5 mr-1.5" />
          Use This Frame
        </Button>
      </div>
    </div>
  );
}
