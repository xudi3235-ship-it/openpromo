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
}

const getStyleImage = (style: StyleGalleryItem) => {
  return style.imageRefs?.[0] || null;
};

export function StyleGallery({
  styles,
  selectedStyleId,
  onStyleSelect,
  isLoading = false,
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

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        Choose a style
      </label>

      <TooltipProvider>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {styles.map((style) => {
            const imageUrl = getStyleImage(style);
            const isSelected = selectedStyleId === style.id;

            return (
              <Tooltip key={style.id} delayDuration={300}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onStyleSelect(style.id)}
                    className={cn(
                      "relative flex-shrink-0 w-16 h-16 rounded-md border-2 overflow-hidden transition-all group",
                      "hover:border-primary/50",
                      isSelected
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border",
                    )}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={style.name || style.id}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">?</span>
                      </div>
                    )}
                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                        <svg
                          className="w-2.5 h-2.5"
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
                    <p className="font-medium text-sm">
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
      </TooltipProvider>
    </div>
  );
}
