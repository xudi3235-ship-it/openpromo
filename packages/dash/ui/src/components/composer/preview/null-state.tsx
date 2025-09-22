import { Image } from "lucide-react";

interface NullStateProps {
  message?: string;
  className?: string;
}

export function PreviewMediaNullState({
  message = "Upload Media to get started",
  className = "w-full h-full bg-muted flex items-center justify-center",
}: NullStateProps) {
  return (
    <div className={className}>
      <div className="text-center text-muted-foreground">
        <Image className="w-12 h-12 mx-auto mb-2" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}
