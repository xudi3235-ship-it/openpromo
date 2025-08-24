import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/components/lib/utils";

const containerVariants = cva("mx-auto w-full", {
  variants: {
    size: {
      sm: "max-w-2xl",
      md: "max-w-4xl",
      lg: "max-w-6xl",
      xl: "max-w-7xl",
      full: "max-w-full",
    },
    padding: {
      none: "",
      sm: "px-4",
      md: "px-4 lg:px-6",
      lg: "px-6 lg:px-8",
    },
  },
  defaultVariants: {
    size: "xl",
    padding: "md",
  },
});

interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  as?: "div" | "main" | "section" | "article" | "aside" | "header" | "footer";
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, padding, as: Comp = "div", ...props }, ref) => {
    return (
      <Comp
        ref={ref}
        className={cn(containerVariants({ size, padding }), className)}
        {...props}
      />
    );
  },
);

Container.displayName = "Container";

export { Container, containerVariants };
