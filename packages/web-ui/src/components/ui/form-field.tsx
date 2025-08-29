import type * as React from "react";
import { cn } from "@/components/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";

interface FormFieldProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  description,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Typography.Label className={cn(error && "text-error")}>
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </Typography.Label>
      )}
      {description && (
        <Typography.Caption className="text-neutral-500">
          {description}
        </Typography.Caption>
      )}
      {children}
      {error && (
        <Typography.Caption className="text-error">{error}</Typography.Caption>
      )}
    </div>
  );
}

interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <Typography.H4>{title}</Typography.H4>}
          {description && (
            <Typography.BodyBase className="text-neutral-600">
              {description}
            </Typography.BodyBase>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

interface FormLayoutProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function FormLayout({
  title,
  description,
  children,
  actions,
  className,
}: FormLayoutProps) {
  return (
    <div className={cn("max-w-2xl mx-auto space-y-8", className)}>
      {(title || description) && (
        <div className="space-y-2">
          {title && <Typography.H2>{title}</Typography.H2>}
          {description && (
            <Typography.BodyLg className="text-neutral-600">
              {description}
            </Typography.BodyLg>
          )}
        </div>
      )}
      <div className="space-y-6">{children}</div>
      {actions && (
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
          {actions}
        </div>
      )}
    </div>
  );
}

// Pre-configured field components
interface TextFieldProps extends React.ComponentProps<typeof Input> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
}

export function TextField({
  label,
  description,
  error,
  required,
  className,
  ...props
}: TextFieldProps) {
  return (
    <FormField
      label={label}
      description={description}
      error={error}
      required={required}
    >
      <Input
        className={cn(
          error && "border-error focus-visible:ring-error",
          className,
        )}
        {...props}
      />
    </FormField>
  );
}

interface TextAreaFieldProps extends React.ComponentProps<typeof Textarea> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
}

export function TextAreaField({
  label,
  description,
  error,
  required,
  className,
  ...props
}: TextAreaFieldProps) {
  return (
    <FormField
      label={label}
      description={description}
      error={error}
      required={required}
    >
      <Textarea
        className={cn(
          error && "border-error focus-visible:ring-error",
          className,
        )}
        {...props}
      />
    </FormField>
  );
}
