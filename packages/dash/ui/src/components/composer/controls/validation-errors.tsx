import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Image,
  type LucideIcon,
  MessageSquare,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import type { ValidationError } from "@/stores/composer-store";

interface ValidationErrorsProps {
  errors: ValidationError[];
}

interface ErrorConfig {
  icon: LucideIcon;
  title: string;
  category: "content" | "media" | "scheduling" | "account";
}

// Centralized error configuration with categorization
const ERROR_CONFIG: Record<ValidationError["type"], ErrorConfig> = {
  // Account-related errors
  no_accounts: {
    icon: Users,
    title: "No Accounts Selected",
    category: "account",
  },

  // Content-related errors
  no_message: {
    icon: MessageSquare,
    title: "Message Required",
    category: "content",
  },

  // Media-related errors
  no_media: {
    icon: Image,
    title: "Media Required",
    category: "media",
  },
  upload_pending: {
    icon: Upload,
    title: "Upload in Progress",
    category: "media",
  },
  upload_failed: {
    icon: XCircle,
    title: "Upload Failed",
    category: "media",
  },

  // Scheduling-related errors
  invalid_scheduling: {
    icon: Calendar,
    title: "Scheduling Issue",
    category: "scheduling",
  },

  // Platform-related errors
  platform_limit_exceeded: {
    icon: AlertTriangle,
    title: "Platform Limit Exceeded",
    category: "content",
  },
};

// Helper to get error configuration with fallback
const getErrorConfig = (type: ValidationError["type"]): ErrorConfig => {
  return (
    ERROR_CONFIG[type] ?? {
      icon: AlertCircle,
      title: "Validation Error",
      category: "content",
    }
  );
};

export function ValidationErrors({ errors }: ValidationErrorsProps) {
  if (errors.length === 0) return null;
  const errorsByType = errors.reduce(
    (acc, error) => {
      if (!acc[error.severity]) acc[error.severity] = [];
      acc[error.severity].push(error);
      return acc;
    },
    {} as Record<"error" | "warning", ValidationError[]>,
  );

  return (
    <div className="mt-3 space-y-2">
      {errorsByType.error && errorsByType.error.length > 0 && (
        <div className="rounded-lg border-l-4 border-red-500 bg-red-50/50 dark:bg-red-950/10 backdrop-blur-sm p-3 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-xs font-semibold text-red-900 dark:text-red-100">
              {errorsByType.error.length}{" "}
              {errorsByType.error.length === 1 ? "Issue" : "Issues"} Found
            </span>
          </div>
          {errorsByType.error.map((error) => {
            const config = getErrorConfig(error.type);
            const Icon = config.icon;
            return (
              <div
                key={`${error.type}-${error.field || "global"}`}
                className="flex items-start gap-2 text-red-800 dark:text-red-200"
              >
                <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed">{error.message}</p>
              </div>
            );
          })}
        </div>
      )}

      {errorsByType.warning && errorsByType.warning.length > 0 && (
        <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-950/10 backdrop-blur-sm p-3 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-semibold text-amber-900 dark:text-amber-100">
              {errorsByType.warning.length} Warning
              {errorsByType.warning.length === 1 ? "" : "s"}
            </span>
          </div>
          {errorsByType.warning.map((error) => {
            const config = getErrorConfig(error.type);
            const Icon = config.icon;
            return (
              <div
                key={`${error.type}-${error.field || "global"}`}
                className="flex items-start gap-2 text-amber-800 dark:text-amber-200"
              >
                <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed">{error.message}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
