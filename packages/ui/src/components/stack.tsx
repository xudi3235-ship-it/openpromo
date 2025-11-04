import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

const stackVariants = cva("flex min-w-0", {
  variants: {
    direction: {
      column: "flex-col",
      row: "flex-row",
    },
    gap: {
      none: "",
      xs: "gap-1",
      sm: "gap-2",
      md: "gap-3",
      lg: "gap-4",
      xl: "gap-6",
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      between: "justify-between",
      end: "justify-end",
      around: "justify-around",
      evenly: "justify-evenly",
    },
    wrap: {
      false: "flex-nowrap",
      true: "flex-wrap",
    },
  },
  defaultVariants: {
    direction: "column",
    gap: "md",
    align: "stretch",
    justify: "start",
    wrap: false,
  },
});

type StackProps = ComponentPropsWithoutRef<"div"> &
  VariantProps<typeof stackVariants>;

const Stack = forwardRef<ElementRef<"div">, StackProps>(
  ({ className, direction, gap, align, justify, wrap, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="stack"
        className={cn(
          stackVariants({ direction, gap, align, justify, wrap }),
          className,
        )}
        {...props}
      />
    );
  },
);
Stack.displayName = "Stack";

export { Stack };
