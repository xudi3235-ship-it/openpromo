import { cn } from "@openpromo/ui/lib/utils";

interface CircularProgressProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * SVG-based circular progress ring with percentage display
 */
export function CircularProgress({
  percent,
  size = 48,
  strokeWidth = 3,
  className,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/20"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-white transition-[stroke-dashoffset] duration-300 ease-out"
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-white">{percent}%</span>
      </div>
    </div>
  );
}
