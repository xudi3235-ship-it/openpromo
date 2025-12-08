import { Badge } from "@openpromo/ui/components/badge";
import type { VideoGenRealtime } from "@shared";

export function StatusPill({
  status,
}: {
  status: VideoGenRealtime.RunStatus | "connecting";
}) {
  const map: Record<
    VideoGenRealtime.RunStatus | "connecting",
    {
      label: string;
      variant: "default" | "secondary" | "success" | "destructive" | "warning";
    }
  > = {
    not_started: { label: "Ready", variant: "default" },
    running: { label: "Running", variant: "secondary" },
    succeeded: { label: "Succeeded", variant: "success" },
    failed: { label: "Failed", variant: "destructive" },
    canceled: { label: "Canceled", variant: "warning" },
    connecting: { label: "Connecting", variant: "warning" },
  };
  const entry = map[status] ?? map.not_started;
  return <Badge variant={entry.variant as never}>{entry.label}</Badge>;
}
