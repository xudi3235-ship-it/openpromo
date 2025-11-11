interface LoadingOverlayProps {
  isVisible: boolean;
  isUploading: boolean;
  isEditMode: boolean;
}

export function LoadingOverlay({
  isVisible,
  isUploading,
  isEditMode,
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-black/70 backdrop-blur-[2px] rounded-lg">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 min-w-80">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-gray-100 dark:border-gray-800" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-gray-900 dark:border-t-gray-100 animate-spin" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {isUploading
                ? "Uploading files"
                : isEditMode
                  ? "Updating product"
                  : "Creating product"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isUploading
                ? "This may take a moment..."
                : "Processing your product..."}
            </p>
          </div>

          <div className="flex space-x-1.5">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
              style={{ animationDelay: "0.1s" }}
            />
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
              style={{ animationDelay: "0.2s" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
