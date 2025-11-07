import { cn } from "@openpromo/ui/lib/utils";
import type { HTMLAttributes } from "react";

type MomentumCardTone = "default" | "muted" | "subtle";

const toneClassName: Record<MomentumCardTone, string> = {
  default: "bg-card/90",
  muted: "bg-muted/50",
  subtle: "bg-background/70",
};

type MomentumCardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: MomentumCardTone;
};

export function MomentumCard({
  className,
  tone = "default",
  ...props
}: MomentumCardProps) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-2xl border border-border/50 p-6",
        toneClassName[tone],
        className,
      )}
    />
  );
}
