import { cn } from "@openpromo/ui/lib/utils";
import type { InferRouterOutputs } from "@orpc/server";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { productVisualsRouter } from "../../../../worker/src/orpc/routes/product-visuals";
import { PresetPreviewModal } from "./preset-preview-modal";

type ProductVisualsRouterOutputs = InferRouterOutputs<
  typeof productVisualsRouter
>;
export type Reference =
  ProductVisualsRouterOutputs["presets"]["references"][number];

interface ReferencePickerProps {
  references: Reference[];
  isLoading?: boolean;
  selectedReferenceId?: string;
  onReferenceSelect?: (reference: Reference) => void;
}

export function PresetPicker({
  references,
  isLoading,
  selectedReferenceId,
  onReferenceSelect,
}: ReferencePickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const MAX_VISIBLE = 8; // 2x4 grid

  if (isLoading) {
    return (
      <div>
        <p className="text-xs text-muted-foreground mb-3">
          Pick a reference for your ad
        </p>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="aspect-square bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (references.length === 0) {
    return null;
  }

  const selectedRef = references.find((r) => r.id === selectedReferenceId);
  const visibleRefs = isExpanded
    ? references
    : references.slice(0, MAX_VISIBLE);
  const hasMore = references.length > MAX_VISIBLE;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">
          Pick a reference for your ad
        </p>
        {selectedRef && (
          <div className="flex items-center gap-1 text-xs text-primary font-medium">
            <div className="w-2 h-2 bg-primary rounded-full" />
            Selected
          </div>
        )}
      </div>

      {/* Responsive Grid */}
      <div className="grid grid-cols-4 gap-2">
        {visibleRefs.map((ref) => (
          <div
            key={ref.id}
            onClick={() => onReferenceSelect?.(ref)}
            className={cn(
              "aspect-square rounded-lg border-2 cursor-pointer transition-all overflow-hidden bg-gray-50 relative group",
              selectedReferenceId === ref.id
                ? "border-primary ring-2 ring-primary/20 shadow-md"
                : "border-gray-200 hover:border-gray-400 hover:shadow-sm",
            )}
          >
            {ref.url && ref.type === "image" ? (
              <img
                src={ref.url}
                alt={ref.description}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : ref.url && ref.type === "video" ? (
              <video
                src={ref.url}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                muted
                loop
                autoPlay
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {selectedReferenceId === ref.id && (
              <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
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
          </div>
        ))}
      </div>

      {/* Selected Reference Description */}
      {selectedRef && (
        <div className="mt-3 flex gap-3">
          {selectedRef.url && selectedRef.type === "image" ? (
            <img
              src={selectedRef.url}
              alt={selectedRef.description}
              className="w-28 h-28 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
              onClick={() => setPreviewModalOpen(true)}
            />
          ) : selectedRef.url && selectedRef.type === "video" ? (
            <video
              src={selectedRef.url}
              className="w-28 h-28 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
              onClick={() => setPreviewModalOpen(true)}
              muted
              loop
              autoPlay
            />
          ) : null}
          <div className="min-w-0 flex-1">
            {selectedRef.description && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                {selectedRef.description}
              </p>
            )}
            {selectedRef.keywords.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {selectedRef.keywords.slice(0, 4).map((kw) => (
                  <span
                    key={kw}
                    className="text-xs bg-muted px-1.5 py-0.5 rounded"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expand/Collapse Button */}
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>
            {isExpanded
              ? "Show less"
              : `Show ${references.length - MAX_VISIBLE} more`}
          </span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
      <PresetPreviewModal
        preset={selectedRef ?? null}
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
      />
    </div>
  );
}
