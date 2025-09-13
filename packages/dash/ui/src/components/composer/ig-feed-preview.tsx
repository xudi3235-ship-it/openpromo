import { Button } from "@openpromo/ui/components/button";
import { Card, CardContent } from "@openpromo/ui/components/card";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  Image,
  MessageCircle,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerStore } from "@/stores/composer-store";

export function IGFeedPreview() {
  const { workspace } = useWorkspace();
  const contentCreateData = useComposerStore((s) => s.contentCreateData);
  const attachments = contentCreateData.base.attachments;
  const caption = contentCreateData.base.message;
  const [currentSlide, setCurrentSlide] = useState(0);

  // Navigation functions
  const nextSlide = () => {
    if (attachments.length > 1) {
      setCurrentSlide((prev) => (prev + 1) % attachments.length);
    }
  };

  const prevSlide = () => {
    if (attachments.length > 1) {
      setCurrentSlide(
        (prev) => (prev - 1 + attachments.length) % attachments.length,
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      prevSlide();
    } else if (e.key === "ArrowRight") {
      nextSlide();
    }
  };

  return (
    <Card className="max-w-sm border-0 shadow-none">
      <CardContent className="p-0">
        {/* Post Header */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 p-0.5">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400"></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm">
                {workspace?.name?.toLowerCase().replace(/\s+/g, "_") ||
                  "your_business"}
              </h4>
              <p className="text-xs text-muted-foreground">
                San Francisco, California
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="p-1">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Post Content */}
        <div
          className="aspect-square relative focus:outline-none group"
          tabIndex={attachments.length > 1 ? 0 : -1}
          onKeyDown={handleKeyDown}
          role="region"
          aria-label="Image carousel"
        >
          {attachments.length > 0 ? (
            <>
              {/* Main Content Display */}
              <div className="w-full h-full overflow-hidden">
                {attachments[currentSlide]?.file ? (
                  attachments[currentSlide].file.type.startsWith("image/") ? (
                    <img
                      src={URL.createObjectURL(attachments[currentSlide].file)}
                      alt={`Preview ${currentSlide + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : attachments[currentSlide].file.type.startsWith(
                      "video/",
                    ) ? (
                    <video
                      src={URL.createObjectURL(attachments[currentSlide].file)}
                      className="w-full h-full object-cover"
                      controls
                    />
                  ) : null
                ) : null}
              </div>

              {/* Carousel Navigation Dots */}
              {attachments.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {attachments.map((attachment, index) => (
                    <button
                      key={attachment.id || `dot-${index}`}
                      type="button"
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentSlide ? "bg-white" : "bg-white/50"
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Arrow Navigation */}
              {attachments.length > 1 && (
                <>
                  {/* Left Arrow */}
                  <button
                    type="button"
                    onClick={prevSlide}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Right Arrow */}
                  <button
                    type="button"
                    onClick={nextSlide}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Multiple Images Indicator */}
              {attachments.length > 1 && (
                <div className="absolute top-4 right-4">
                  <div className="flex items-center space-x-1">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <div className="grid grid-cols-2 gap-0.5">
                        <div className="w-1 h-1 bg-white/80 rounded-sm"></div>
                        <div className="w-1 h-1 bg-white/80 rounded-sm"></div>
                        <div className="w-1 h-1 bg-white/80 rounded-sm"></div>
                        <div className="w-1 h-1 bg-white/80 rounded-sm"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="p-0 hover:bg-transparent"
              >
                <Heart className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-0 hover:bg-transparent"
              >
                <MessageCircle className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-0 hover:bg-transparent"
              >
                <Send className="w-6 h-6" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="p-0 hover:bg-transparent"
            >
              <Bookmark className="w-6 h-6" />
            </Button>
          </div>

          {/* Likes */}
          <div className="text-sm font-semibold mb-1">1,247 likes</div>

          {/* Caption */}
          <div className="text-sm mb-2 whitespace-pre-wrap">
            <span className="font-semibold">
              {workspace?.name?.toLowerCase().replace(/\s+/g, "_") ||
                "your_business"}
            </span>{" "}
            <span>
              {caption || (
                <span className="text-muted-foreground">
                  Start typing your caption...
                </span>
              )}
            </span>
          </div>

          {/* Comments preview */}
          <div className="text-sm text-muted-foreground mb-1">
            View all 89 comments
          </div>

          {/* Timestamp */}
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            2 hours ago
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
