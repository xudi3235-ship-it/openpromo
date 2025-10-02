import type * as React from "react";
import { Typography } from "../components/typography";
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
            {title && <Typography.H1>{title}</Typography.H1>}
            {description && (
              <Typography.BodyBase>{description}</Typography.BodyBase>
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
            {title && <Typography.H3>{title}</Typography.H3>}
            {description && (
              <Typography.BodyBase>{description}</Typography.BodyBase>
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
      <Typography.H3 className="mb-2">{title}</Typography.H3>
      {description && (
        <Typography.BodyBase className="mb-6 max-w-md mx-auto">
          {description}
        </Typography.BodyBase>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
