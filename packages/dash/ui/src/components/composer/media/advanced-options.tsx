import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@openpromo/ui/components/collapsible";
import { Slider } from "@openpromo/ui/components/slider";
import { Textarea } from "@openpromo/ui/components/textarea";
import { cn } from "@openpromo/ui/lib/utils";
import { ChevronDown } from "lucide-react";

interface AdvancedOptionsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  referenceImageUrl: string;
  onReferenceImageUrlChange: (url: string) => void;
  batchCount: number;
  onBatchCountChange: (count: number) => void;
  maxBatchCount: number;
  prompt: string;
  onPromptChange: (prompt: string) => void;
}

export function AdvancedOptions({
  isOpen,
  onOpenChange,
  referenceImageUrl,
  onReferenceImageUrlChange,
  batchCount,
  onBatchCountChange,
  maxBatchCount,
  prompt,
  onPromptChange,
}: AdvancedOptionsProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            isOpen && "transform rotate-180",
          )}
        />
        Advanced options
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-3">
        {/* Reference Image URL */}
        <div className="space-y-1.5">
          <label
            htmlFor="reference-url-input"
            className="text-xs font-medium text-muted-foreground"
          >
            Reference Image URL
            <span className="font-normal ml-1 text-muted-foreground/70">
              (optional)
            </span>
          </label>
          <Textarea
            id="reference-url-input"
            value={referenceImageUrl}
            onChange={(e) => onReferenceImageUrlChange(e.target.value)}
            placeholder="Paste reference image URL..."
            rows={2}
            className="resize-none font-mono text-xs"
          />
        </div>

        {/* Batch Count */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              Batch Count
            </label>
            <span className="text-xs text-muted-foreground">{batchCount}</span>
          </div>
          <Slider
            value={[batchCount]}
            onValueChange={(value) => onBatchCountChange(value[0] || 1)}
            min={1}
            max={maxBatchCount}
            step={1}
            className="w-full"
          />
        </div>

        {/* Custom Prompt */}
        <div className="space-y-1.5">
          <label
            htmlFor="prompt-input"
            className="text-xs font-medium text-muted-foreground"
          >
            Custom Prompt
            <span className="font-normal ml-1">(optional)</span>
          </label>
          <Textarea
            id="prompt-input"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Add custom instructions..."
            rows={3}
            className="resize-none"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
