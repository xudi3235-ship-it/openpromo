import type * as React from "react";
import { Text } from "../components/typography";
import { cn } from "../lib/utils";

interface PageLayoutProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({
  title,
  description,
  action,
  children,
  className,
}: PageLayoutProps) {
  return (
    <div className={cn("page-container", className)}>
      {(title || description || action) && (
        <div className="page-header">
          <div>
            {title && (
              <Text as="h1" variant="heading" size="3xl" weight="semibold">
                {title}
              </Text>
            )}
            {description && (
              <Text as="p" size="md" weight="medium" tone="muted">
                {description}
              </Text>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="page-content">{children}</div>
    </div>
  );
}

interface PageSectionProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageSection({
  title,
  description,
  action,
  children,
  className,
}: PageSectionProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {(title || description || action) && (
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <Text as="h3" variant="heading" size="2xl" weight="semibold">
                {title}
              </Text>
            )}
            {description && (
              <Text as="p" size="md" weight="medium" tone="muted">
                {description}
              </Text>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

interface CardGridProps {
  children: React.ReactNode;
  variant?: "default" | "small";
  className?: string;
}

export function CardGrid({
  children,
  variant = "default",
  className,
}: CardGridProps) {
  return (
    <div
      className={cn(
        variant === "small" ? "card-grid-sm" : "card-grid",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("text-center py-12 px-6", className)}>
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      <Text
        as="h3"
        variant="heading"
        size="2xl"
        weight="semibold"
        className="mb-2"
      >
        {title}
      </Text>
      {description && (
        <Text
          as="p"
          size="md"
          weight="medium"
          tone="muted"
          className="mb-6 max-w-md mx-auto"
        >
          {description}
        </Text>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
