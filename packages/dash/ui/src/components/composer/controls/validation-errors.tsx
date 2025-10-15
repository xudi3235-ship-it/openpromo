import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@openpromo/ui/components/alert";
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
  instagram_requires_media: {
    icon: Image,
    title: "Instagram Requires Media",
    category: "media",
  },
  message_too_long: {
    icon: MessageSquare,
    title: "Caption Too Long",
    category: "content",
  },
  message_length_warning: {
    icon: MessageSquare,
    title: "Caption Near Limit",
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
    <div className="mt-3 space-y-3">
      {errorsByType.error && errorsByType.error.length > 0 && (
        <Alert variant="destructive" className="w-full">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {errorsByType.error.length}{" "}
            {errorsByType.error.length === 1 ? "Issue" : "Issues"} Found
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1.5">
              {errorsByType.error.map((error, index) => {
                const config = getErrorConfig(error.type);
                const Icon = config.icon;
                return (
                  <li
                    key={`error-${index}-${error.type}-${error.field || "global"}`}
                    className="flex items-start gap-2"
                  >
                    <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-70" />
                    <span className="text-xs leading-relaxed">
                      {error.message}
                    </span>
                  </li>
                );
              })}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {errorsByType.warning && errorsByType.warning.length > 0 && (
        <Alert className="w-full">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {errorsByType.warning.length} Warning
            {errorsByType.warning.length === 1 ? "" : "s"}
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1.5">
              {errorsByType.warning.map((error, index) => {
                const config = getErrorConfig(error.type);
                const Icon = config.icon;
                return (
                  <li
                    key={`warning-${index}-${error.type}-${error.field || "global"}`}
                    className="flex items-start gap-2"
                  >
                    <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-70" />
                    <span className="text-xs leading-relaxed">
                      {error.message}
                    </span>
                  </li>
                );
              })}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
