import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../lib/utils";

const gridVariants = cva("grid", {
  variants: {
    cols: {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
      6: "grid-cols-6",
      12: "grid-cols-12",
      auto: "grid-cols-auto",
      "auto-fit": "grid-cols-[repeat(auto-fit,minmax(250px,1fr))]",
      "auto-fill": "grid-cols-[repeat(auto-fill,minmax(250px,1fr))]",
    },
    responsive: {
      none: "",
      sm: "sm:grid-cols-2",
      md: "md:grid-cols-3",
      lg: "lg:grid-cols-4",
      adaptive: "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    },
    gap: {
      none: "gap-0",
      xs: "gap-1",
      sm: "gap-2",
      md: "gap-4",
      lg: "gap-6",
      xl: "gap-8",
      "2xl": "gap-12",
      "3xl": "gap-16",
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    },
    justify: {
      start: "justify-items-start",
      center: "justify-items-center",
      end: "justify-items-end",
      stretch: "justify-items-stretch",
    },
  },
  defaultVariants: {
    cols: 1,
    responsive: "none",
    gap: "md",
    align: "stretch",
    justify: "stretch",
  },
});

interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {
  as?: "div" | "section" | "article" | "aside" | "main";
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  (
    {
      className,
      cols,
      responsive,
      gap,
      align,
      justify,
      as: Comp = "div",
      ...props
    },
    ref,
  ) => {
    return (
      <Comp
        ref={ref}
        className={cn(
          gridVariants({ cols, responsive, gap, align, justify }),
          className,
        )}
        {...props}
      />
    );
  },
);

Grid.displayName = "Grid";

export { Grid, gridVariants };
