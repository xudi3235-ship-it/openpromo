import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

const textVariants = cva("font-sans antialiased text-foreground", {
  variants: {
    variant: {
      heading: "tracking-tight",
      body: "",
      label: "tracking-[0.08em]",
      mono: "font-mono",
    },
    size: {
      xs: "text-xs leading-5",
      sm: "text-sm leading-6",
      md: "text-base leading-7",
      lg: "text-lg leading-7",
      xl: "text-xl leading-8",
      "2xl": "text-2xl leading-8 md:text-3xl",
      "3xl": "text-3xl leading-tight md:text-4xl",
      "4xl": "text-4xl leading-tight md:text-5xl",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      subtle: "text-muted-foreground/70",
      primary: "text-primary",
      success: "text-emerald-600 dark:text-emerald-400",
      warning: "text-amber-600 dark:text-amber-400",
      destructive: "text-destructive",
    },
    weight: {
      regular: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
      justify: "text-justify",
    },
    transform: {
      none: "",
      uppercase: "uppercase",
      capitalize: "capitalize",
    },
  },
  defaultVariants: {
    variant: "body",
    size: "md",
    tone: "default",
    weight: "regular",
    align: "left",
    transform: "none",
  },
});

type VariantName = VariantProps<typeof textVariants>["variant"];

type AllowedTone = VariantProps<typeof textVariants>["tone"];

const FEATURE_ACCENTS = {
  blue: "text-sky-600 dark:text-sky-400",
  orange: "text-orange-500 dark:text-orange-400",
  purple: "text-purple-500 dark:text-purple-400",
  green: "text-emerald-600 dark:text-emerald-400",
} as const;

type FeatureAccent = keyof typeof FEATURE_ACCENTS;

type TextProps<T extends React.ElementType = "p"> = {
  as?: T;
  variant?: VariantName;
  size?: VariantProps<typeof textVariants>["size"];
  tone?: AllowedTone;
  weight?: VariantProps<typeof textVariants>["weight"];
  align?: VariantProps<typeof textVariants>["align"];
  transform?: VariantProps<typeof textVariants>["transform"];
  truncate?: boolean;
  noWrap?: boolean;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "color">;

type TextComponent = <T extends React.ElementType = "p">(
  props: TextProps<T> & { ref?: React.Ref<HTMLElement> },
) => React.ReactElement | null;

function TextInternal<T extends React.ElementType = "p">(
  {
    as,
    className,
    variant,
    size,
    tone,
    weight,
    align,
    transform,
    truncate = false,
    noWrap = false,
    ...props
  }: TextProps<T>,
  ref: React.Ref<HTMLElement>,
) {
  const Component = (as ?? "p") as React.ElementType;
  return (
    <Component
      ref={ref}
      className={cn(
        textVariants({ variant, size, tone, weight, align, transform }),
        truncate && "truncate",
        noWrap && "whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}

const Text = forwardRef(TextInternal) as TextComponent;

const H1 = forwardRef<HTMLHeadingElement, TextProps<"h1">>(
  (
    { variant = "heading", size = "4xl", weight = "semibold", ...props },
    ref,
  ) => (
    <Text
      ref={ref}
      as="h1"
      variant={variant}
      size={size}
      weight={weight}
      {...props}
    />
  ),
);
H1.displayName = "Typography.H1";

const H2 = forwardRef<HTMLHeadingElement, TextProps<"h2">>(
  (
    { variant = "heading", size = "3xl", weight = "semibold", ...props },
    ref,
  ) => (
    <Text
      ref={ref}
      as="h2"
      variant={variant}
      size={size}
      weight={weight}
      {...props}
    />
  ),
);
H2.displayName = "Typography.H2";

const H3 = forwardRef<HTMLHeadingElement, TextProps<"h3">>(
  (
    { variant = "heading", size = "2xl", weight = "semibold", ...props },
    ref,
  ) => (
    <Text
      ref={ref}
      as="h3"
      variant={variant}
      size={size}
      weight={weight}
      {...props}
    />
  ),
);
H3.displayName = "Typography.H3";

const H4 = forwardRef<HTMLHeadingElement, TextProps<"h4">>(
  (
    { variant = "heading", size = "xl", weight = "semibold", ...props },
    ref,
  ) => (
    <Text
      ref={ref}
      as="h4"
      variant={variant}
      size={size}
      weight={weight}
      {...props}
    />
  ),
);
H4.displayName = "Typography.H4";

const H5 = forwardRef<HTMLHeadingElement, TextProps<"h5">>(
  (
    { variant = "heading", size = "lg", weight = "semibold", ...props },
    ref,
  ) => (
    <Text
      ref={ref}
      as="h5"
      variant={variant}
      size={size}
      weight={weight}
      {...props}
    />
  ),
);
H5.displayName = "Typography.H5";

const H6 = forwardRef<HTMLHeadingElement, TextProps<"h6">>(
  (
    {
      variant = "label",
      size = "sm",
      weight = "semibold",
      transform = "uppercase",
      ...props
    },
    ref,
  ) => (
    <Text
      ref={ref}
      as="h6"
      variant={variant}
      size={size}
      weight={weight}
      transform={transform}
      {...props}
    />
  ),
);
H6.displayName = "Typography.H6";

const Display = forwardRef<HTMLHeadingElement, TextProps<"h1">>(
  ({ variant = "heading", size = "4xl", weight = "bold", ...props }, ref) => (
    <Text
      ref={ref}
      as="h1"
      variant={variant}
      size={size}
      weight={weight}
      {...props}
    />
  ),
);
Display.displayName = "Typography.Display";

const Hero = forwardRef<HTMLHeadingElement, TextProps<"h1">>(
  (
    { variant = "heading", size = "3xl", weight = "semibold", ...props },
    ref,
  ) => (
    <Text
      ref={ref}
      as="h1"
      variant={variant}
      size={size}
      weight={weight}
      {...props}
    />
  ),
);
Hero.displayName = "Typography.Hero";

const P = forwardRef<HTMLParagraphElement, TextProps<"p">>(
  ({ variant = "body", size = "md", weight = "regular", ...props }, ref) => (
    <Text
      ref={ref}
      as="p"
      variant={variant}
      size={size}
      weight={weight}
      {...props}
    />
  ),
);
P.displayName = "Typography.P";

const BodyLg = forwardRef<HTMLParagraphElement, TextProps<"p">>(
  ({ variant = "body", size = "lg", weight = "regular", ...props }, ref) => (
    <Text
      ref={ref}
      as="p"
      variant={variant}
      size={size}
      weight={weight}
      {...props}
    />
  ),
);
BodyLg.displayName = "Typography.BodyLg";

const BodyBase = forwardRef<HTMLParagraphElement, TextProps<"p">>(
  ({ variant = "body", size = "md", weight = "medium", ...props }, ref) => (
    <Text
      ref={ref}
      as="p"
      variant={variant}
      size={size}
      weight={weight}
      {...props}
    />
  ),
);
BodyBase.displayName = "Typography.BodyBase";

const BodySm = forwardRef<HTMLParagraphElement, TextProps<"p">>(
  ({ variant = "body", size = "sm", weight = "regular", ...props }, ref) => (
    <Text
      ref={ref}
      as="p"
      variant={variant}
      size={size}
      weight={weight}
      {...props}
    />
  ),
);
BodySm.displayName = "Typography.BodySm";

const Caption = forwardRef<HTMLSpanElement, TextProps<"span">>(
  (
    {
      variant = "body",
      size = "xs",
      weight = "medium",
      tone = "muted",
      ...props
    },
    ref,
  ) => (
    <Text
      ref={ref}
      as="span"
      variant={variant}
      size={size}
      weight={weight}
      tone={tone}
      {...props}
    />
  ),
);
Caption.displayName = "Typography.Caption";

const Overline = forwardRef<HTMLSpanElement, TextProps<"span">>(
  (
    {
      variant = "label",
      size = "xs",
      weight = "semibold",
      transform = "uppercase",
      tone = "muted",
      ...props
    },
    ref,
  ) => (
    <Text
      ref={ref}
      as="span"
      variant={variant}
      size={size}
      weight={weight}
      transform={transform}
      tone={tone}
      {...props}
    />
  ),
);
Overline.displayName = "Typography.Overline";

const Label = forwardRef<HTMLLabelElement, TextProps<"label">>(
  ({ variant = "label", size = "sm", weight = "medium", ...props }, ref) => (
    <Text
      ref={ref}
      as="label"
      variant={variant}
      size={size}
      weight={weight}
      {...props}
    />
  ),
);
Label.displayName = "Typography.Label";

const FeatureTag = forwardRef<
  HTMLSpanElement,
  TextProps<"span"> & { color?: FeatureAccent }
>(
  (
    {
      variant = "label",
      size = "sm",
      weight = "semibold",
      transform = "uppercase",
      tone = "muted",
      color,
      className,
      ...props
    },
    ref,
  ) => (
    <Text
      ref={ref}
      as="span"
      variant={variant}
      size={size}
      weight={weight}
      transform={transform}
      tone={tone}
      className={cn(color ? FEATURE_ACCENTS[color] : null, className)}
      {...props}
    />
  ),
);
FeatureTag.displayName = "Typography.FeatureTag";

const Announcement = forwardRef<HTMLSpanElement, TextProps<"span">>(
  ({ variant = "body", size = "sm", weight = "medium", ...props }, ref) => (
    <Text
      ref={ref}
      as="span"
      variant={variant}
      size={size}
      weight={weight}
      {...props}
    />
  ),
);
Announcement.displayName = "Typography.Announcement";

const AnnouncementBadge = forwardRef<HTMLSpanElement, TextProps<"span">>(
  (
    {
      variant = "label",
      size = "xs",
      weight = "bold",
      transform = "uppercase",
      ...props
    },
    ref,
  ) => (
    <Text
      ref={ref}
      as="span"
      variant={variant}
      size={size}
      weight={weight}
      transform={transform}
      {...props}
    />
  ),
);
AnnouncementBadge.displayName = "Typography.AnnouncementBadge";

const Large = forwardRef<HTMLDivElement, TextProps<"div">>(
  ({ variant = "body", size = "lg", weight = "semibold", ...props }, ref) => (
    <Text
      ref={ref}
      as="div"
      variant={variant}
      size={size}
      weight={weight}
      {...props}
    />
  ),
);
Large.displayName = "Typography.Large";

const Lead = forwardRef<HTMLParagraphElement, TextProps<"p">>(
  ({ variant = "body", size = "lg", tone = "muted", ...props }, ref) => (
    <Text
      ref={ref}
      as="p"
      variant={variant}
      size={size}
      tone={tone}
      {...props}
    />
  ),
);
Lead.displayName = "Typography.Lead";

const Muted = forwardRef<HTMLParagraphElement, TextProps<"p">>(
  ({ variant = "body", size = "sm", tone = "muted", ...props }, ref) => (
    <Text
      ref={ref}
      as="p"
      variant={variant}
      size={size}
      tone={tone}
      {...props}
    />
  ),
);
Muted.displayName = "Typography.Muted";

const Small = forwardRef<HTMLElement, TextProps<"small">>(
  ({ variant = "body", size = "sm", weight = "medium", ...props }, ref) => (
    <Text
      ref={ref}
      as="small"
      variant={variant}
      size={size}
      weight={weight}
      {...props}
    />
  ),
);
Small.displayName = "Typography.Small";

const InlineCode = forwardRef<HTMLElement, TextProps<"code">>(
  ({ className, size = "sm", tone = "subtle", ...props }, ref) => (
    <Text
      ref={ref}
      as="code"
      variant="mono"
      size={size}
      tone={tone}
      weight="regular"
      className={cn("rounded bg-muted px-[0.35rem] py-[0.15rem]", className)}
      {...props}
    />
  ),
);
InlineCode.displayName = "Typography.InlineCode";

const Blockquote = forwardRef<HTMLQuoteElement, TextProps<"blockquote">>(
  ({ className, tone = "muted", ...props }, ref) => (
    <Text
      ref={ref}
      as="blockquote"
      variant="body"
      tone={tone}
      size="lg"
      className={cn("border-l-2 pl-4 italic", className)}
      {...props}
    />
  ),
);
Blockquote.displayName = "Typography.Blockquote";

const List = forwardRef<HTMLUListElement, TextProps<"ul">>(
  ({ className, ...props }, ref) => (
    <Text
      ref={ref}
      as="ul"
      variant="body"
      size="md"
      className={cn("my-4 ml-5 list-disc space-y-2", className)}
      {...props}
    />
  ),
);
List.displayName = "Typography.List";

export {
  Text,
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
