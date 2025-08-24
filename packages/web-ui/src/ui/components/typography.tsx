import { cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/ui/lib/utils";

// Base styles for different typography variants
const typographyStyles = {
  h1: "text-4xl md:text-5xl lg:text-6xl font-semibold text-neutral-900 leading-tight",
  h2: "text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900",
  h3: "text-sm font-medium text-neutral-900",
  h4: "scroll-m-20 text-xl font-semibold tracking-tight",
  p: "leading-7 [&:not(:first-child)]:mt-6",
  bodyLg: "text-lg text-neutral-600 leading-relaxed",
  bodyBase: "text-base font-medium text-neutral-600",
  bodySm: "text-sm text-neutral-600 leading-relaxed",
  featureTag: "text-[13px] font-semibold",
  announcement: "text-sm font-medium text-neutral-700",
  announcementBadge: "text-[10px] font-bold leading-none",
  large: "text-lg font-semibold",
  lead: "text-xl text-muted-foreground",
  muted: "text-sm text-muted-foreground",
  small: "text-sm font-medium leading-none",
  inlineCode:
    "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
  blockquote: "mt-6 border-l-2 pl-6 italic",
  list: "my-6 ml-6 list-disc [&>li]:mt-2",
};

// Color variants
const colorVariants = cva("", {
  variants: {
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
    color: "default",
  },
});

interface BaseTypographyProps extends React.HTMLAttributes<HTMLElement> {
  color?:
    | "default"
    | "primary"
    | "secondary"
    | "blue"
    | "orange"
    | "purple"
    | "green";
}

// H1 Component
const H1 = React.forwardRef<HTMLHeadingElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <h1
      ref={ref}
      className={cn(typographyStyles.h1, colorVariants({ color }), className)}
      {...props}
    />
  ),
);
H1.displayName = "Typography.H1";

// H2 Component
const H2 = React.forwardRef<HTMLHeadingElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <h2
      ref={ref}
      className={cn(typographyStyles.h2, colorVariants({ color }), className)}
      {...props}
    />
  ),
);
H2.displayName = "Typography.H2";

// H3 Component
const H3 = React.forwardRef<HTMLHeadingElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(typographyStyles.h3, colorVariants({ color }), className)}
      {...props}
    />
  ),
);
H3.displayName = "Typography.H3";

// H4 Component
const H4 = React.forwardRef<HTMLHeadingElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <h4
      ref={ref}
      className={cn(typographyStyles.h4, colorVariants({ color }), className)}
      {...props}
    />
  ),
);
H4.displayName = "Typography.H4";

// P Component
const P = React.forwardRef<HTMLParagraphElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <p
      ref={ref}
      className={cn(typographyStyles.p, colorVariants({ color }), className)}
      {...props}
    />
  ),
);
P.displayName = "Typography.P";

// Body variants
const BodyLg = React.forwardRef<HTMLParagraphElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        typographyStyles.bodyLg,
        colorVariants({ color }),
        className,
      )}
      {...props}
    />
  ),
);
BodyLg.displayName = "Typography.BodyLg";

const BodyBase = React.forwardRef<HTMLParagraphElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        typographyStyles.bodyBase,
        colorVariants({ color }),
        className,
      )}
      {...props}
    />
  ),
);
BodyBase.displayName = "Typography.BodyBase";

const BodySm = React.forwardRef<HTMLParagraphElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        typographyStyles.bodySm,
        colorVariants({ color }),
        className,
      )}
      {...props}
    />
  ),
);
BodySm.displayName = "Typography.BodySm";

// Specialized components
const FeatureTag = React.forwardRef<HTMLSpanElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        typographyStyles.featureTag,
        colorVariants({ color }),
        className,
      )}
      {...props}
    />
  ),
);
FeatureTag.displayName = "Typography.FeatureTag";

const Announcement = React.forwardRef<HTMLSpanElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        typographyStyles.announcement,
        colorVariants({ color }),
        className,
      )}
      {...props}
    />
  ),
);
Announcement.displayName = "Typography.Announcement";

const AnnouncementBadge = React.forwardRef<
  HTMLSpanElement,
  BaseTypographyProps
>(({ className, color = "default", ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      typographyStyles.announcementBadge,
      colorVariants({ color }),
      className,
    )}
    {...props}
  />
));
AnnouncementBadge.displayName = "Typography.AnnouncementBadge";

// Utility components
const Large = React.forwardRef<HTMLDivElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        typographyStyles.large,
        colorVariants({ color }),
        className,
      )}
      {...props}
    />
  ),
);
Large.displayName = "Typography.Large";

const Lead = React.forwardRef<HTMLParagraphElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <p
      ref={ref}
      className={cn(typographyStyles.lead, colorVariants({ color }), className)}
      {...props}
    />
  ),
);
Lead.displayName = "Typography.Lead";

const Muted = React.forwardRef<HTMLParagraphElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        typographyStyles.muted,
        colorVariants({ color }),
        className,
      )}
      {...props}
    />
  ),
);
Muted.displayName = "Typography.Muted";

const Small = React.forwardRef<HTMLElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <small
      ref={ref}
      className={cn(
        typographyStyles.small,
        colorVariants({ color }),
        className,
      )}
      {...props}
    />
  ),
);
Small.displayName = "Typography.Small";

const InlineCode = React.forwardRef<HTMLElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <code
      ref={ref}
      className={cn(
        typographyStyles.inlineCode,
        colorVariants({ color }),
        className,
      )}
      {...props}
    />
  ),
);
InlineCode.displayName = "Typography.InlineCode";

const Blockquote = React.forwardRef<HTMLQuoteElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <blockquote
      ref={ref}
      className={cn(
        typographyStyles.blockquote,
        colorVariants({ color }),
        className,
      )}
      {...props}
    />
  ),
);
Blockquote.displayName = "Typography.Blockquote";

const List = React.forwardRef<HTMLUListElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <ul
      ref={ref}
      className={cn(typographyStyles.list, colorVariants({ color }), className)}
      {...props}
    />
  ),
);
List.displayName = "Typography.List";

// Main Typography object with compound components
const Typography = {
  H1,
  H2,
  H3,
  H4,
  P,
  BodyLg,
  BodyBase,
  BodySm,
  FeatureTag,
  Announcement,
  AnnouncementBadge,
  Large,
  Lead,
  Muted,
  Small,
  InlineCode,
  Blockquote,
  List,
};

export { Typography };
