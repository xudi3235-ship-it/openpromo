interface PreviewItemProps {
  platform: "facebook" | "instagram";
  contentType: "reel" | "feed";
  children: React.ReactNode;
}

export function PreviewItem({
  platform,
  contentType,
  children,
}: PreviewItemProps) {
  const platformConfig = {
    facebook: {
      color: "bg-blue-600",
      name: "Facebook",
    },
    instagram: {
      color: "bg-gradient-to-br from-purple-500 to-pink-500",
      name: "Instagram",
    },
  };

  const config = platformConfig[platform];
  const displayName = `${config.name} ${contentType === "reel" ? "Reel" : "Feed"}`;

  return (
    <div className="space-y-3 flex flex-col items-center w-full max-w-sm">
      <div className="flex items-center gap-2 px-1">
        <div className={`w-3 h-3 rounded ${config.color}`}></div>
        <span className="text-xs text-muted-foreground font-medium">
          {displayName}
        </span>
      </div>
      <div className="w-full flex justify-center">{children}</div>
    </div>
  );
}
