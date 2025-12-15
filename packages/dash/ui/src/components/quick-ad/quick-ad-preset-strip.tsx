import { cn } from "@openpromo/ui/lib/utils";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { Reference } from "@/components/instant-ad/video-presets";

interface QuickAdPresetStripProps {
  presets: Reference[];
  selectedPresetId: string | undefined;
  onPresetSelect: (presetId: string) => void;
  isLoading?: boolean;
}

export function QuickAdPresetStrip({
  presets,
  selectedPresetId,
  onPresetSelect,
  isLoading = false,
}: QuickAdPresetStripProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 200;
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 overflow-hidden">
        {["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((id) => (
          <div
            key={id}
            className="w-16 h-16 bg-muted rounded-lg animate-pulse flex-shrink-0"
          />
        ))}
      </div>
    );
  }

  if (presets.length === 0) {
    return null;
  }

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-background/90 border border-border rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-muted"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-1 py-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {presets.map((preset) => {
          const isSelected = preset.id === selectedPresetId;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPresetSelect(preset.id)}
              className={cn(
                "relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all group/item",
                "border-2 cursor-pointer",
                isSelected
                  ? "border-primary ring-2 ring-primary/20 shadow-md"
                  : "border-border hover:border-muted-foreground hover:shadow-sm",
              )}
              title={preset.description || undefined}
            >
              {preset.url ? (
                <img
                  src={preset.url}
                  alt={preset.description || "Style preset"}
                  className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">?</span>
                </div>
              )}
              {isSelected && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-background/90 border border-border rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-muted"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
