import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ElementRef, ReactNode } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

const listStateVariants = cva(
  "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/5 text-sm text-muted-foreground",
  {
    variants: {
      size: {
        sm: "px-4 py-6",
        md: "px-6 py-10",
        lg: "px-8 py-12",
      },
      align: {
        center: "items-center text-center",
        start: "items-start text-left",
      },
      fullHeight: {
        false: "",
        true: "min-h-[320px]",
      },
    },
    defaultVariants: {
      size: "md",
      align: "center",
      fullHeight: false,
    },
  },
);

type ListStateProps = ComponentPropsWithoutRef<"div"> &
  VariantProps<typeof listStateVariants> & {
    title?: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    asChild?: boolean;
  };

const ListState = forwardRef<ElementRef<"div">, ListStateProps>(
  (
    {
      className,
      title,
      description,
      icon,
      size,
      align,
      fullHeight,
      children,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref}
        data-slot="list-state"
        className={cn(
          listStateVariants({ size, align, fullHeight }),
          className,
        )}
        {...props}
      >
        {icon ? <div className="text-muted-foreground/80">{icon}</div> : null}
        {title ? (
          <div className="text-sm font-medium text-foreground">{title}</div>
        ) : null}
        {description ? (
          <div className="text-xs text-muted-foreground">{description}</div>
        ) : null}
        {children}
      </Comp>
    );
  },
);
ListState.displayName = "ListState";

type ListSkeletonElement = "div" | "li";

type ListSkeletonProps = {
  count?: number;
  lines?: number;
  className?: string;
  as?: ListSkeletonElement;
};

const ListSkeleton = ({
  count = 6,
  lines = 2,
  className,
  as: Element = "div",
}: ListSkeletonProps) => {
  return (
    <Element className={cn("space-y-1", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          /* biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rendering */
          key={index}
          className="rounded-md border border-transparent bg-muted/10 p-2"
        >
          <div className="flex items-start gap-2">
            <div className="h-8 w-8 rounded-full bg-muted/40" />
            <div className="flex-1 space-y-1.5">
              {Array.from({ length: lines }).map((__, lineIndex) => (
                <div
                  /* biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rendering */
                  key={lineIndex}
                  className={cn(
                    "h-2.5 rounded bg-muted/40",
                    lineIndex === 0
                      ? "w-1/2"
                      : lineIndex === 1
                        ? "w-3/4"
                        : "w-2/3",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </Element>
  );
};

export { ListSkeleton, ListState };
