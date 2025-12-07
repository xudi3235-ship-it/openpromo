import { cn } from "@openpromo/ui/lib/utils";
import type { InferRouterOutputs } from "@orpc/server";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { productVisualsRouter } from "../../../../worker/src/orpc/routes/product-visuals";

type ProductVisualsRouterOutputs = InferRouterOutputs<
  typeof productVisualsRouter
>;
export type Preset =
  ProductVisualsRouterOutputs["videoPresets"]["presets"][number];

interface VideoPresetsProps {
  presets: Preset[];
  isLoading: boolean;
  selectedPresetId?: string;
  onPresetSelect?: (preset: Preset) => void;
}

export function VideoPresets({
  presets,
  isLoading,
  selectedPresetId,
  onPresetSelect,
}: VideoPresetsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_VISIBLE = 8; // 2x4 grid

  if (isLoading) {
    return (
      <div>
        <h4 className="text-xs font-medium mb-3">Video Presets</h4>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="w-20 h-20 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (presets.length === 0) {
    return null;
  }

  const selectedPreset = presets.find((p) => p.id === selectedPresetId);
  const visiblePresets = isExpanded ? presets : presets.slice(0, MAX_VISIBLE);
  const hasMore = presets.length > MAX_VISIBLE;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium">Video Presets</h4>
        {selectedPreset && (
          <div className="flex items-center gap-1 text-xs text-primary font-medium">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            {selectedPreset.name}
          </div>
        )}
      </div>

      {/* 2x4 Grid */}
      <div className="grid grid-cols-4 gap-2">
        {visiblePresets.map((preset) => (
          <div
            key={preset.id}
            onClick={() => onPresetSelect?.(preset)}
            className={cn(
              "w-20 h-20 rounded-lg border-2 cursor-pointer transition-all overflow-hidden bg-gray-50 relative group",
              selectedPresetId === preset.id
                ? "border-primary ring-2 ring-primary/20 shadow-md scale-105"
                : "border-gray-200 hover:border-gray-400 hover:shadow-sm",
            )}
          >
            {preset.thumbnailUrl && (
              <img
                src={preset.thumbnailUrl}
                alt={preset.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {selectedPresetId === preset.id && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-primary-foreground"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-1">
              <h5
                className={cn(
                  "text-[8px] font-medium leading-tight truncate",
                  selectedPresetId === preset.id
                    ? "text-white font-semibold"
                    : "text-white",
                )}
              >
                {preset.name}
              </h5>
            </div>
          </div>
        ))}
      </div>

      {/* Expand/Collapse Button */}
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>
            {isExpanded
              ? "Show less"
              : `Show ${presets.length - MAX_VISIBLE} more`}
          </span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}
