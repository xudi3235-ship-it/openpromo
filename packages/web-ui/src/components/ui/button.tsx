import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/components/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-neutral-800 to-neutral-900 border border-neutral-700 text-white font-semibold shadow-sm hover:opacity-90 rounded-lg",
        secondary:
          "border border-neutral-200 text-neutral-900 bg-white font-semibold hover:bg-neutral-50 rounded-lg",
        destructive:
          "bg-error text-error-foreground shadow-sm hover:bg-error/90 focus-visible:ring-error/20 dark:focus-visible:ring-error/40 rounded-lg",
        outline:
          "border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 rounded-lg",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 rounded-lg",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-success text-success-foreground shadow-sm hover:bg-success/90 focus-visible:ring-success/20 rounded-lg",
        warning:
          "bg-warning text-warning-foreground shadow-sm hover:bg-warning/90 focus-visible:ring-warning/20 rounded-lg",
        // Mode toggle variants (special case - keep rounded-full for mode toggles)
        "mode-active":
          "bg-gradient-to-b from-neutral-800 to-neutral-900 border border-neutral-700 text-white shadow-sm hover:opacity-90 rounded-full",
        "mode-inactive": "text-neutral-600 hover:bg-neutral-100 rounded-full",
      },
      size: {
        xs: "h-7 px-2 text-xs has-[>svg]:px-1.5",
        sm: "h-8 px-3 text-sm has-[>svg]:px-2.5",
        default: "h-9 px-4 has-[>svg]:px-3",
        lg: "h-10 px-6 has-[>svg]:px-4",
        xl: "h-11 px-5 has-[>svg]:px-4",
        icon: "size-9 p-0",
        "icon-sm": "size-8 p-0",
        "icon-lg": "size-10 p-0",
        "mode-icon": "size-7 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
