import { Badge } from "@openpromo/ui/components/badge";
import type { VideoGenRealtime } from "@shared";

export function StatusPill({ status }: { status: VideoGenRealtime.RunStatus }) {
  const map: Record<
    VideoGenRealtime.RunStatus,
    {
      label: string;
      variant: "default" | "secondary" | "success" | "destructive" | "warning";
    }
  > = {
    not_started: { label: "Not started", variant: "default" },
    running: { label: "Running", variant: "secondary" },
    succeeded: { label: "Succeeded", variant: "success" },
    failed: { label: "Failed", variant: "destructive" },
    canceled: { label: "Canceled", variant: "warning" },
  };
  const entry = map[status] ?? map.not_started;
  return <Badge variant={entry.variant as never}>{entry.label}</Badge>;
}
