import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const sectionVariants = cva("w-full", {
  variants: {
    spacing: {
      none: "",
      xs: "py-8",
      sm: "py-12",
      md: "py-16 lg:py-20",
      lg: "py-20 lg:py-32",
      xl: "py-32 lg:py-40",
    },
    background: {
      transparent: "",
      white: "bg-white",
      gray: "bg-gray-50",
      neutral: "bg-neutral-50",
    },
  },
  defaultVariants: {
    spacing: "md",
    background: "transparent",
  },
});

interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionVariants> {
  as?: "section" | "div" | "main" | "article" | "aside" | "header" | "footer";
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, spacing, background, as: Comp = "section", ...props }, ref) => {
    return (
      <Comp
        // @ts-expect-error
        ref={ref}
        className={cn(sectionVariants({ spacing, background }), className)}
        {...props}
      />
    );
  },
);

Section.displayName = "Section";

export { Section, sectionVariants };
