import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/ui/lib/utils";

const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "text-4xl md:text-5xl lg:text-6xl font-semibold text-neutral-900 leading-tight",
      h2: "text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900",
      h3: "text-sm font-medium text-neutral-900",
      h4: "scroll-m-20 text-xl font-semibold tracking-tight",
      p: "leading-7 [&:not(:first-child)]:mt-6",
      "body-lg": "text-lg text-neutral-600 leading-relaxed",
      "body-base": "text-base font-medium text-neutral-600",
      "body-sm": "text-sm text-neutral-600 leading-relaxed",
      "feature-tag": "text-[13px] font-semibold",
      announcement: "text-sm font-medium text-neutral-700",
      "announcement-badge": "text-[10px] font-bold leading-none",
      large: "text-lg font-semibold",
      lead: "text-xl text-muted-foreground",
      muted: "text-sm text-muted-foreground",
      small: "text-sm font-medium leading-none",
      "inline-code":
        "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      blockquote: "mt-6 border-l-2 pl-6 italic",
      list: "my-6 ml-6 list-disc [&>li]:mt-2",
    },
    color: {
      default: "",
      primary: "text-neutral-900",
      secondary: "text-neutral-600",
      blue: "text-blue-600",
      orange: "text-orange-600",
      purple: "text-purple-600",
      green: "text-green-text",
    },
  },
  defaultVariants: {
    variant: "body-base",
    color: "default",
  },
});

// @ts-expect-error
interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?:
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6"
    | "p"
    | "span"
    | "div"
    | "small"
    | "code"
    | "blockquote"
    | "ul";
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, color, as, ...props }, ref) => {
    const Comp = as || getDefaultElement(variant);

    return (
      <Comp
        // @ts-expect-error
        ref={ref}
        // @ts-expect-error
        className={cn(typographyVariants({ variant, color, className }))}
        {...props}
      />
    );
  },
);

function getDefaultElement(variant: TypographyProps["variant"]) {
  switch (variant) {
    case "h1":
      return "h1";
    case "h2":
      return "h2";
    case "h3":
      return "h3";
    case "h4":
      return "h4";
    case "small":
      return "small";
    case "inline-code":
      return "code";
    case "blockquote":
      return "blockquote";
    case "list":
      return "ul";
    case "feature-tag":
    case "announcement-badge":
      return "span";
    default:
      return "p";
  }
}

Typography.displayName = "Typography";

export { Typography, typographyVariants };
