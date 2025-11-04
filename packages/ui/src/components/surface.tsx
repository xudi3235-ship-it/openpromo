import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

const surfaceVariants = cva(
  "relative isolate rounded-xl border border-border/60 bg-background text-foreground transition-colors duration-200",
  {
    variants: {
      tone: {
        default: "",
        subtle: "border-border/50 bg-background/80 backdrop-blur-sm",
        muted: "border-border/40 bg-muted/30",
        ghost: "border-transparent bg-transparent shadow-none",
      },
      padded: {
        none: "",
        xs: "p-2",
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
      },
      shadow: {
        none: "",
        sm: "shadow-xs",
        md: "shadow-sm",
      },
      interactive: {
        false: "",
        true: "hover:border-border/70 hover:bg-background/90",
      },
    },
    compoundVariants: [
      {
        tone: "ghost",
        interactive: true,
        class: "hover:bg-muted/20 hover:border-border/40",
      },
    ],
    defaultVariants: {
      tone: "default",
      padded: "none",
      shadow: "none",
      interactive: false,
    },
  },
);

type SurfaceProps = ComponentPropsWithoutRef<"div"> &
  VariantProps<typeof surfaceVariants> & {
    asChild?: boolean;
  };

const Surface = forwardRef<ElementRef<"div">, SurfaceProps>(
  (
    { className, tone, padded, shadow, interactive, asChild = false, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "div";

    return (
      <Comp
        ref={ref}
        data-slot="surface"
        className={cn(
          surfaceVariants({ tone, padded, shadow, interactive }),
          className,
        )}
        {...props}
      />
    );
  },
);

Surface.displayName = "Surface";

const surfaceSectionVariants = cva("flex flex-col gap-2", {
  variants: {
    padded: {
      none: "",
      xs: "px-3 py-2",
      sm: "px-4 py-3",
      md: "px-6 py-4",
      lg: "px-8 py-6",
    },
    divider: {
      false: "",
      true: "border-border/60",
    },
  },
  defaultVariants: {
    padded: "sm",
    divider: false,
  },
});

type SurfaceSectionProps = ComponentPropsWithoutRef<"div"> &
  VariantProps<typeof surfaceSectionVariants>;

const SurfaceHeader = forwardRef<ElementRef<"div">, SurfaceSectionProps>(
  ({ className, padded, divider, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="surface-header"
        className={cn(
          "flex flex-col gap-2 border-b border-transparent",
          surfaceSectionVariants({ padded, divider }),
          className,
        )}
        {...props}
      />
    );
  },
);
SurfaceHeader.displayName = "SurfaceHeader";

const SurfaceBody = forwardRef<ElementRef<"div">, SurfaceSectionProps>(
  ({ className, padded, divider, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="surface-body"
        className={cn(
          "flex min-h-0 flex-1 flex-col border-transparent",
          surfaceSectionVariants({ padded, divider }),
          className,
        )}
        {...props}
      />
    );
  },
);
SurfaceBody.displayName = "SurfaceBody";

const SurfaceFooter = forwardRef<ElementRef<"div">, SurfaceSectionProps>(
  ({ className, padded, divider, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="surface-footer"
        className={cn(
          "flex flex-col gap-2 border-t border-transparent",
          surfaceSectionVariants({ padded, divider }),
          className,
        )}
        {...props}
      />
    );
  },
);
SurfaceFooter.displayName = "SurfaceFooter";

export { Surface, SurfaceBody, SurfaceFooter, SurfaceHeader };
