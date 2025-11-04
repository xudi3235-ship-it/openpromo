import { cn } from "@openpromo/ui/lib/utils";
import type { PropsWithChildren } from "react";
import type { BasePreviewProps, PreviewPlatform } from "../types";
import { SIZE_CONFIG } from "../types";

export interface PreviewContainerProps
  extends PropsWithChildren<BasePreviewProps> {
  platform?: PreviewPlatform;
  aspectRatio?: "9/16" | "4/5" | "1/1" | "16/9" | "auto";
  /** Whether to enforce height constraint (useful for compact grids) */
  constrainHeight?: boolean;
}

export function PreviewContainer({
  children,
  size = "default",
  platform,
  aspectRatio = "auto",
  constrainHeight = false,
  className,
}: PreviewContainerProps) {
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div
      className={cn(
        "flex flex-col",
        sizeConfig.width,
        sizeConfig.maxWidth,
        constrainHeight && sizeConfig.height,
        className,
      )}
      data-preview-size={size}
      data-preview-platform={platform}
    >
      <div
        className={cn(
          "w-full overflow-hidden rounded-lg",
          aspectRatio !== "auto" && `aspect-[${aspectRatio}]`,
        )}
      >
        {children}
      </div>
    </div>
  );
}
