import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

const toolbarVariants = cva(
  "flex flex-wrap items-center justify-between gap-x-3 gap-y-2",
  {
    variants: {
      size: {
        sm: "min-h-9",
        md: "min-h-11",
      },
      tone: {
        default: "",
        subtle: "border border-border/60 bg-muted/10 px-3 py-2 rounded-md",
      },
    },
    defaultVariants: {
      size: "md",
      tone: "default",
    },
  },
);

type ToolbarProps = ComponentPropsWithoutRef<"div"> &
  VariantProps<typeof toolbarVariants>;

const Toolbar = forwardRef<ElementRef<"div">, ToolbarProps>(
  ({ className, size, tone, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="toolbar"
        className={cn(toolbarVariants({ size, tone }), className)}
        {...props}
      />
    );
  },
);
Toolbar.displayName = "Toolbar";

const toolbarSectionVariants = cva("flex flex-wrap items-center gap-2", {
  variants: {
    align: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
    },
    grow: {
      false: "flex-initial",
      true: "flex-1",
    },
    gap: {
      sm: "gap-1.5",
      md: "gap-2",
      lg: "gap-3",
    },
  },
  defaultVariants: {
    align: "start",
    grow: false,
    gap: "md",
  },
});

type ToolbarSectionProps = ComponentPropsWithoutRef<"div"> &
  VariantProps<typeof toolbarSectionVariants>;

const ToolbarSection = forwardRef<ElementRef<"div">, ToolbarSectionProps>(
  ({ className, align, grow, gap, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="toolbar-section"
        className={cn(toolbarSectionVariants({ align, grow, gap }), className)}
        {...props}
      />
    );
  },
);
ToolbarSection.displayName = "ToolbarSection";

export { Toolbar, ToolbarSection };
