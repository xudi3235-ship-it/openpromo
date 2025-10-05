import type { ContentPublishingStatus } from "@shared/content";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  type LucideIcon,
  Zap,
} from "lucide-react";

export interface StatusConfig {
  label: string;
  icon: LucideIcon;
  className: string;
  variant: "default" | "secondary" | "outline" | "destructive";
}

export const STATUS_CONFIG: Record<ContentPublishingStatus, StatusConfig> = {
  PUBLISHED: {
    label: "Published",
    icon: CheckCircle,
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    variant: "default",
  },
  SCHEDULED: {
    label: "Scheduled",
    icon: Clock,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    variant: "secondary",
  },
  DRAFT: {
    label: "Draft",
    icon: FileText,
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    variant: "outline",
  },
  FAILED_TO_PUBLISH: {
    label: "Failed",
    icon: AlertCircle,
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    variant: "destructive",
  },
  PUBLISH_NOW: {
    label: "Publishing",
    icon: Zap,
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    variant: "default",
  },
};
