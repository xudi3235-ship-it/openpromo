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
          "bg-gradient-to-b from-[#1E1E28] to-[#141317] border border-[var(--neutral-800)] text-white font-semibold shadow-sm hover:opacity-90 text-[15px] rounded-lg",
        secondary:
          "border border-[var(--neutral-200)] text-[var(--neutral-900)] bg-white font-semibold hover:bg-neutral-50 text-[15px] rounded-lg",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 rounded-lg",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 rounded-lg",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 rounded-lg",
        link: "text-primary underline-offset-4 hover:underline rounded-none",
        // Legacy variants (deprecated - use primary/secondary instead)
        default:
          "bg-gradient-to-b from-[#1E1E28] to-[#141317] border border-[var(--neutral-800)] text-white font-semibold shadow-sm hover:opacity-90 text-[15px] rounded-lg",
        "dark-gradient":
          "bg-gradient-to-b from-[#1E1E28] to-[#141317] border border-[var(--neutral-800)] text-white font-semibold shadow-sm hover:opacity-90 text-[15px] rounded-lg",
        "light-outline":
          "border border-[var(--neutral-200)] text-[var(--neutral-900)] bg-white font-semibold hover:bg-neutral-50 text-[15px] rounded-lg",
        // Mode toggle variants (special case - keep rounded-full for mode toggles)
        "mode-active":
          "bg-gradient-to-b from-[#1E1E28] to-[#141317] border border-[#333335] text-white shadow-sm hover:opacity-90 rounded-full",
        "mode-inactive":
          "text-[var(--neutral-600)] hover:bg-neutral-100 rounded-full",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-6 has-[>svg]:px-4",
        xl: "h-11 px-5 pr-4",
        icon: "size-9",
        "mode-icon": "w-7 h-7 p-0",
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
