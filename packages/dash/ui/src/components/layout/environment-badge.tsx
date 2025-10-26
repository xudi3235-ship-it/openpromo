import { AlertTriangle, Monitor } from "lucide-react";

/**
 * Dynamic Island style environment indicator.
 * Floats at the top center like iPhone's Dynamic Island for non-production environments.
 */
export function EnvironmentBanner() {
  const environment = import.meta.env.VITE_ENVIRONMENT;

  // Don't show anything in production
  if (environment !== "staging" && environment !== "local") {
    return null;
  }

  const isLocal = environment === "local";
  const bgColor = isLocal
    ? "bg-yellow-500/90 dark:bg-yellow-600/90"
    : "bg-orange-500/90 dark:bg-orange-600/90";
  const textColor = "text-white";

  return (
    <div className="fixed top-1 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={`${bgColor} ${textColor} backdrop-blur-md rounded-full shadow-sm px-3 py-0.5 flex items-center gap-1.5 text-[10px] font-medium animate-in fade-in slide-in-from-top-2 duration-300`}
      >
        {isLocal ? (
          <Monitor className="h-3 w-3" />
        ) : (
          <AlertTriangle className="h-3 w-3" />
        )}
        <span className="uppercase tracking-wider leading-tight">
          {isLocal ? "Local Development" : "Staging Environment"}
        </span>
      </div>
    </div>
  );
}
