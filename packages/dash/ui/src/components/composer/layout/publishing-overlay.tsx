import { useEffect, useState } from "react";

interface PublishingOverlayProps {
  isVisible: boolean;
  status: "loading" | "success" | "error";
  actionType: "draft" | "schedule" | "publish";
  onComplete?: () => void;
}

export function PublishingOverlay({
  isVisible,
  status,
  actionType,
  onComplete,
}: PublishingOverlayProps) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldShow(true);
    }
  }, [isVisible]);

  useEffect(() => {
    if (status === "success" || status === "error") {
      const timer = setTimeout(() => {
        setShouldShow(false);
        onComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, onComplete]);

  if (!shouldShow) return null;

  const getIcon = () => {
    switch (status) {
      case "loading":
        return (
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-gray-100"></div>
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-gray-900 animate-spin"></div>
          </div>
        );
      case "success":
        return (
          <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <title>Success</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        );
      case "error":
        return (
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <title>Error</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        );
    }
  };

  const getMessage = () => {
    switch (status) {
      case "loading":
        return actionType === "draft"
          ? "Saving draft"
          : actionType === "schedule"
            ? "Scheduling content"
            : "Publishing content";
      case "success":
        return actionType === "draft"
          ? "Draft saved"
          : actionType === "schedule"
            ? "Content scheduled"
            : "Publishing in progress";
      case "error":
        return actionType === "draft"
          ? "Failed to save"
          : actionType === "schedule"
            ? "Failed to schedule"
            : "Failed to publish";
    }
  };

  const getSubMessage = () => {
    if (status === "success" && actionType === "publish") {
      return "We'll notify you once it's live.";
    }
    return undefined;
  };

  const subMessage = getSubMessage();

  return (
    <div className="fixed inset-0 bg-white/70 backdrop-blur-[2px] z-50 flex items-center justify-center">
      <div className="bg-white border border-gray-200 rounded-2xl p-12 min-w-80">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="flex items-center justify-center">{getIcon()}</div>

          <div className="space-y-1">
            <h3 className="text-lg font-medium text-gray-900">
              {getMessage()}
            </h3>
            {subMessage && (
              <p className="text-sm text-gray-600">{subMessage}</p>
            )}
          </div>

          {status === "loading" && (
            <div className="flex space-x-1.5">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
