import { cva, type VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90 rounded-md",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 rounded-md",
        destructive:
          "border-transparent bg-error text-error-foreground [a&]:hover:bg-error/90 focus-visible:ring-error/20 dark:focus-visible:ring-error/40 rounded-md",
        success:
          "border-transparent bg-success text-success-foreground [a&]:hover:bg-success/90 focus-visible:ring-success/20 rounded-md",
        warning:
          "border-transparent bg-warning text-warning-foreground [a&]:hover:bg-warning/90 focus-visible:ring-warning/20 rounded-md",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground rounded-md",
        // Special announcement badges (keep rounded-full for design intent)
        announcement:
          "inline-flex items-center gap-1.5 h-8 px-3 bg-white border border-neutral-200 rounded-full",
        "announcement-pill":
          "flex items-center justify-center h-5 px-2 bg-success-muted border border-success-border rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
