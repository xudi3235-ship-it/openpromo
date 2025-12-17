"use client";

import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "../lib/utils";

type FeatherState = "none" | "top" | "bottom" | "both";

function getFeatherMask(state: FeatherState, size: number): string {
  const fadeSize = `${size}px`;
  switch (state) {
    case "top":
      return `linear-gradient(to bottom, transparent 0%, black ${fadeSize}, black 100%)`;
    case "bottom":
      return `linear-gradient(to bottom, black 0%, black calc(100% - ${fadeSize}), transparent 100%)`;
    case "both":
      return `linear-gradient(to bottom, transparent 0%, black ${fadeSize}, black calc(100% - ${fadeSize}), transparent 100%)`;
    default:
      return "none";
  }
}

interface ScrollAreaProps
  extends React.ComponentProps<typeof ScrollAreaPrimitive.Root> {
  /** Enable scroll-aware feather effect on edges */
  feather?: boolean;
  /** Size of the feather fade in pixels (default: 24) */
  featherSize?: number;
}

function ScrollArea({
  className,
  children,
  feather = false,
  featherSize = 24,
  ...props
}: ScrollAreaProps) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [featherState, setFeatherState] = React.useState<FeatherState>("none");

  React.useEffect(() => {
    if (!feather) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateFeatherState = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const isScrollable = scrollHeight > clientHeight;

      if (!isScrollable) {
        setFeatherState("none");
        return;
      }

      const atTop = scrollTop <= 1;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      if (atTop && atBottom) {
        setFeatherState("none");
      } else if (atTop) {
        setFeatherState("bottom");
      } else if (atBottom) {
        setFeatherState("top");
      } else {
        setFeatherState("both");
      }
    };

    updateFeatherState();
    viewport.addEventListener("scroll", updateFeatherState, { passive: true });

    const resizeObserver = new ResizeObserver(updateFeatherState);
    resizeObserver.observe(viewport);

    return () => {
      viewport.removeEventListener("scroll", updateFeatherState);
      resizeObserver.disconnect();
    };
  }, [feather]);

  const maskStyle = feather
    ? { maskImage: getFeatherMask(featherState, featherSize) }
    : undefined;

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
        style={maskStyle}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
