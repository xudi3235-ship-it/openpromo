import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/ui/lib/utils";

const spacerVariants = cva("", {
  variants: {
    size: {
      xs: "h-2 w-2",
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
      xl: "h-12 w-12",
      "2xl": "h-16 w-16",
      "3xl": "h-20 w-20",
    },
    direction: {
      both: "",
      horizontal: "h-0",
      vertical: "w-0",
    },
  },
  defaultVariants: {
    size: "md",
    direction: "both",
  },
});

interface SpacerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spacerVariants> {}

const Spacer = React.forwardRef<HTMLDivElement, SpacerProps>(
  ({ className, size, direction, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(spacerVariants({ size, direction }), className)}
        {...props}
      />
    );
  },
);

Spacer.displayName = "Spacer";

export { Spacer, spacerVariants };
