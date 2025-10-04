import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@openpromo/ui/components/tooltip";
import type { ReactNode } from "react";

interface ColumnHeaderWithTooltipProps {
  children: ReactNode;
  tooltip: string;
  className?: string;
}

/**
 * A reusable component for column headers with tooltips.
 * Wraps the header content with a tooltip that explains what the column represents.
 */
export function ColumnHeaderWithTooltip({
  children,
  tooltip,
  className,
}: ColumnHeaderWithTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={className}>{children}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
