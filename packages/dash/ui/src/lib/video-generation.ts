export function parseUrlList(value: string) {
  return value
    .split(/[\n,]/)
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}

export function formatElapsedTime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export function shortenId(id: string) {
  if (id.length <= 24) return id;
  return `${id.slice(0, 12)}…${id.slice(-8)}`;
}

export function getStateTone(state: string) {
  switch (state) {
    case "completed":
      return "bg-emerald-500/15 text-emerald-700 border-emerald-200";
    case "failed":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "processing":
      return "bg-amber-500/15 text-amber-700 border-amber-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function getStateBadge(state: string) {
  switch (state) {
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "processing":
      return "Processing";
    case "not_started":
      return "Starting";
    default:
      return "Unknown";
  }
}
