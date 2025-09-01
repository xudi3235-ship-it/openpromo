import * as React from "react";
import { cn } from "@/components/lib/utils";

// Base styles for different typography variants
const typographyStyles = {
  h1: "text-2xl md:text-3xl font-semibold leading-tight",
  h2: "text-xl md:text-2xl font-semibold leading-tight",
  h3: "text-lg font-semibold",
  h4: "text-base font-semibold",
  h5: "text-sm font-semibold",
  h6: "text-xs font-semibold uppercase tracking-wide",
  display: "text-4xl md:text-5xl lg:text-6xl font-bold leading-tight",
  hero: "text-3xl md:text-4xl font-bold leading-tight",
  p: "leading-7 [&:not(:first-child)]:mt-6",
  bodyLg: "text-lg leading-relaxed",
  bodyBase: "text-base font-medium",
  bodySm: "text-sm leading-relaxed",
  caption: "text-xs leading-normal",
  overline: "text-xs font-semibold uppercase tracking-wide",
  label: "text-sm font-medium leading-none",
  featureTag: "text-[13px] font-semibold",
  announcement: "text-sm font-medium",
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
    <h1 ref={ref} className={cn(typographyStyles.h1, className)} {...props} />
  ),
);
H1.displayName = "Typography.H1";

// H2 Component
const H2 = React.forwardRef<HTMLHeadingElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <h2 ref={ref} className={cn(typographyStyles.h2, className)} {...props} />
  ),
);
H2.displayName = "Typography.H2";

// H3 Component
const H3 = React.forwardRef<HTMLHeadingElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <h3 ref={ref} className={cn(typographyStyles.h3, className)} {...props} />
  ),
);
H3.displayName = "Typography.H3";

// H4 Component
const H4 = React.forwardRef<HTMLHeadingElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <h4 ref={ref} className={cn(typographyStyles.h4, className)} {...props} />
  ),
);
H4.displayName = "Typography.H4";

// H5 Component
const H5 = React.forwardRef<HTMLHeadingElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <h5 ref={ref} className={cn(typographyStyles.h5, className)} {...props} />
  ),
);
H5.displayName = "Typography.H5";

// H6 Component
const H6 = React.forwardRef<HTMLHeadingElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <h6 ref={ref} className={cn(typographyStyles.h6, className)} {...props} />
  ),
);
H6.displayName = "Typography.H6";

// Display Component (for very large titles)
const Display = React.forwardRef<HTMLHeadingElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <h1
      ref={ref}
      className={cn(typographyStyles.display, className)}
      {...props}
    />
  ),
);
Display.displayName = "Typography.Display";

// Hero Component (for hero sections)
const Hero = React.forwardRef<HTMLHeadingElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <h1 ref={ref} className={cn(typographyStyles.hero, className)} {...props} />
  ),
);
Hero.displayName = "Typography.Hero";

// P Component
const P = React.forwardRef<HTMLParagraphElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <p ref={ref} className={cn(typographyStyles.p, className)} {...props} />
  ),
);
P.displayName = "Typography.P";

// Body variants
const BodyLg = React.forwardRef<HTMLParagraphElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <p
      ref={ref}
      className={cn(typographyStyles.bodyLg, className)}
      {...props}
    />
  ),
);
BodyLg.displayName = "Typography.BodyLg";

const BodyBase = React.forwardRef<HTMLParagraphElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <p
      ref={ref}
      className={cn(typographyStyles.bodyBase, className)}
      {...props}
    />
  ),
);
BodyBase.displayName = "Typography.BodyBase";

const BodySm = React.forwardRef<HTMLParagraphElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <p
      ref={ref}
      className={cn(typographyStyles.bodySm, className)}
      {...props}
    />
  ),
);
BodySm.displayName = "Typography.BodySm";

// Caption Component
const Caption = React.forwardRef<HTMLParagraphElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <p
      ref={ref}
      className={cn(typographyStyles.caption, className)}
      {...props}
    />
  ),
);
Caption.displayName = "Typography.Caption";

// Overline Component
const Overline = React.forwardRef<HTMLSpanElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(typographyStyles.overline, className)}
      {...props}
    />
  ),
);
Overline.displayName = "Typography.Overline";

// Label Component
const Label = React.forwardRef<
  HTMLLabelElement,
  BaseTypographyProps & { htmlFor?: string }
>(({ className, color = "default", ...props }, ref) => (
  <label
    ref={ref}
    className={cn(typographyStyles.label, className)}
    {...props}
  />
));
Label.displayName = "Typography.Label";

// Specialized components
const FeatureTag = React.forwardRef<HTMLSpanElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(typographyStyles.featureTag, className)}
      {...props}
    />
  ),
);
FeatureTag.displayName = "Typography.FeatureTag";

const Announcement = React.forwardRef<HTMLSpanElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(typographyStyles.announcement, className)}
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
    className={cn(typographyStyles.announcementBadge, className)}
    {...props}
  />
));
AnnouncementBadge.displayName = "Typography.AnnouncementBadge";

// Utility components
const Large = React.forwardRef<HTMLDivElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(typographyStyles.large, className)}
      {...props}
    />
  ),
);
Large.displayName = "Typography.Large";

const Lead = React.forwardRef<HTMLParagraphElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <p ref={ref} className={cn(typographyStyles.lead, className)} {...props} />
  ),
);
Lead.displayName = "Typography.Lead";

const Muted = React.forwardRef<HTMLParagraphElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <p ref={ref} className={cn(typographyStyles.muted, className)} {...props} />
  ),
);
Muted.displayName = "Typography.Muted";

const Small = React.forwardRef<HTMLElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <small
      ref={ref}
      className={cn(typographyStyles.small, className)}
      {...props}
    />
  ),
);
Small.displayName = "Typography.Small";

const InlineCode = React.forwardRef<HTMLElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <code
      ref={ref}
      className={cn(typographyStyles.inlineCode, className)}
      {...props}
    />
  ),
);
InlineCode.displayName = "Typography.InlineCode";

const Blockquote = React.forwardRef<HTMLQuoteElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <blockquote
      ref={ref}
      className={cn(typographyStyles.blockquote, className)}
      {...props}
    />
  ),
);
Blockquote.displayName = "Typography.Blockquote";

const List = React.forwardRef<HTMLUListElement, BaseTypographyProps>(
  ({ className, color = "default", ...props }, ref) => (
    <ul ref={ref} className={cn(typographyStyles.list, className)} {...props} />
  ),
);
List.displayName = "Typography.List";

// Main Typography object with compound components
const Typography = {
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Display,
  Hero,
  P,
  BodyLg,
  BodyBase,
  BodySm,
  Caption,
  Overline,
  Label,
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
