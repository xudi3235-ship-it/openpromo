export function LiveArtifactsGrid({
  artifacts,
}: {
  artifacts: {
    videos: Array<{ id: string; videoUrl: string }>;
    images: Array<{ id: string; imageUrl: string }>;
  };
}) {
  const hasAssets =
    (artifacts.videos?.length ?? 0) + (artifacts.images?.length ?? 0) > 0;
  if (!hasAssets) {
    return (
      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        Waiting for outputs...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h5 className="text-sm font-semibold">Live</h5>
      <div className="grid gap-3 sm:grid-cols-2">
        {artifacts.videos?.map((video) => (
          <div
            key={video.id}
            className="overflow-hidden rounded-lg border bg-white"
          >
            <video
              src={video.videoUrl}
              autoPlay
              muted
              loop
              playsInline
              controls
              className="aspect-video w-full object-cover"
            />
          </div>
        ))}
        {artifacts.images?.map((image) => (
          <div
            key={image.id}
            className="overflow-hidden rounded-lg border bg-white"
          >
            <img
              src={image.imageUrl}
              alt={image.id}
              className="h-48 w-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
