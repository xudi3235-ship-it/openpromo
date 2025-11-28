import { Spinner } from "@openpromo/ui/components/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@openpromo/ui/components/tooltip";
import { cn } from "@openpromo/ui/lib/utils";

export interface StyleGalleryItem {
  id: string;
  name: string | null;
  description: string | null;
  imageRefs: string[];
}

export interface StyleGalleryProps {
  styles: StyleGalleryItem[];
  selectedStyleId: string;
  onStyleSelect: (styleId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  helperText?: string;
}

const getStyleImage = (style: StyleGalleryItem) => {
  return style.imageRefs?.[0] || null;
};

export function StyleGallery({
  styles,
  selectedStyleId,
  onStyleSelect,
  isLoading = false,
  disabled = false,
  helperText,
}: StyleGalleryProps) {
  if (isLoading) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Choose a style
        </label>
        <div className="flex items-center justify-center py-4 border rounded-lg">
          <div className="text-center space-y-1">
            <Spinner className="h-4 w-4 mx-auto" />
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedStyle = styles.find((s) => s.id === selectedStyleId);

  return (
    <div className="space-y-3 flex-shrink-0">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground block">
          Choose a style
        </label>
        {disabled && helperText && (
          <span className="text-[11px] text-muted-foreground">
            {helperText}
          </span>
        )}
      </div>

      {/* Large preview of selected style */}
      {selectedStyle && (
        <div className="relative rounded-lg border-2 border-primary overflow-hidden bg-muted">
          <div className="aspect-video w-full">
            {selectedStyle.imageRefs?.[0] ? (
              <img
                src={selectedStyle.imageRefs[0]}
                alt={selectedStyle.name || selectedStyle.id}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-sm text-muted-foreground">
                  No preview available
                </span>
              </div>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <p className="text-white font-medium text-sm">
              {selectedStyle.name || selectedStyle.id}
            </p>
            {selectedStyle.description && (
              <p className="text-white/80 text-xs mt-0.5 line-clamp-2">
                {selectedStyle.description}
              </p>
            )}
          </div>
        </div>
      )}

      <TooltipProvider>
        <div className="max-h-64 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {styles.map((style) => {
              const imageUrl = getStyleImage(style);
              const isSelected = selectedStyleId === style.id;

              return (
                <Tooltip key={style.id} delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => {
                        if (disabled) return;
                        onStyleSelect(style.id);
                      }}
                      disabled={disabled}
                      className={cn(
                        "relative aspect-square w-full rounded-md border-2 overflow-hidden transition-all group",
                        disabled
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:border-primary/50",
                        isSelected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border",
                      )}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={style.name || style.id}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                          <span className="text-xs text-muted-foreground">
                            ?
                          </span>
                        </div>
                      )}
                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="absolute top-1 right-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                          <svg
                            className="h-2.5 w-2.5"
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
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {style.name || style.id}
                      </p>
                      {style.description && (
                        <p className="text-xs text-muted-foreground">
                          {style.description}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
