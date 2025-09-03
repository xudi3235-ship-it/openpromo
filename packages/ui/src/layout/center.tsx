import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const centerVariants = cva("flex items-center justify-center", {
  variants: {
    direction: {
      both: "flex-col",
      horizontal: "flex-row",
      vertical: "flex-col justify-start",
    },
    minHeight: {
      none: "",
      screen: "min-h-screen",
      "50vh": "min-h-[50vh]",
      "75vh": "min-h-[75vh]",
    },
  },
  defaultVariants: {
    direction: "both",
    minHeight: "none",
  },
});

interface CenterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof centerVariants> {
  as?: "div" | "section" | "main" | "article";
}

const Center = React.forwardRef<HTMLDivElement, CenterProps>(
  ({ className, direction, minHeight, as: Comp = "div", ...props }, ref) => {
    return (
      <Comp
        ref={ref}
        className={cn(centerVariants({ direction, minHeight }), className)}
        {...props}
      />
    );
  },
);

Center.displayName = "Center";

export { Center, centerVariants };
