import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

const pageVariants = cva("flex min-h-0 flex-1 flex-col", {
  variants: {
    gap: {
      none: "",
      xs: "gap-2",
      sm: "gap-3",
      md: "gap-4",
      lg: "gap-6",
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    },
    bleed: {
      false: "",
      true: "px-0",
    },
  },
  defaultVariants: {
    gap: "md",
    padding: "none",
    bleed: false,
  },
});

type PageProps = ComponentPropsWithoutRef<"div"> &
  VariantProps<typeof pageVariants>;

const Page = forwardRef<ElementRef<"div">, PageProps>(
  ({ className, gap, padding, bleed, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="page"
        className={cn(pageVariants({ gap, padding, bleed }), className)}
        {...props}
      />
    );
  },
);
Page.displayName = "Page";

const pageHeaderVariants = cva(
  "flex flex-wrap items-center justify-between gap-3 border-transparent",
  {
    variants: {
      align: {
        start: "items-start",
        center: "items-center",
        end: "items-end",
      },
      divider: {
        false: "",
        true: "border-b border-border/60 pb-4",
      },
    },
    defaultVariants: {
      align: "center",
      divider: false,
    },
  },
);

type PageHeaderProps = ComponentPropsWithoutRef<"header"> &
  VariantProps<typeof pageHeaderVariants>;

const PageHeader = forwardRef<ElementRef<"header">, PageHeaderProps>(
  ({ className, align, divider, ...props }, ref) => {
    return (
      <header
        ref={ref}
        data-slot="page-header"
        className={cn(pageHeaderVariants({ align, divider }), className)}
        {...props}
      />
    );
  },
);
PageHeader.displayName = "PageHeader";

const pageContentVariants = cva("flex min-h-0 flex-1 gap-4", {
  variants: {
    direction: {
      column: "flex-col",
      row: "flex-row",
    },
    gap: {
      xs: "gap-2",
      sm: "gap-3",
      md: "gap-4",
      lg: "gap-6",
    },
  },
  defaultVariants: {
    direction: "column",
    gap: "md",
  },
});

type PageContentProps = ComponentPropsWithoutRef<"div"> &
  VariantProps<typeof pageContentVariants>;

const PageContent = forwardRef<ElementRef<"div">, PageContentProps>(
  ({ className, direction, gap, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="page-content"
        className={cn(pageContentVariants({ direction, gap }), className)}
        {...props}
      />
    );
  },
);
PageContent.displayName = "PageContent";

export { Page, PageContent, PageHeader };
