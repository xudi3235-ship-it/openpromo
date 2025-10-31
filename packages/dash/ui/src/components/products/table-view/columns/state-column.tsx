import type { ProductSelectType } from "@core/schemas/product.sql";
import { Badge } from "@openpromo/ui/components/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

const stateConfig = {
  not_started: {
    label: "Not Started",
    variant: "secondary" as const,
    icon: Clock,
  },
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    icon: Clock,
  },
  processing: {
    label: "Processing",
    variant: "default" as const,
    icon: Loader2,
  },
  ready: {
    label: "Ready",
    variant: "success" as const,
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    variant: "destructive" as const,
    icon: XCircle,
  },
};

export const stateColumn: ColumnDef<ProductSelectType> = {
  accessorKey: "state",
  header: "State",
  size: 130,
  cell: ({ row }) => {
    const state = row.original.state;
    const config = stateConfig[state] || stateConfig.not_started;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon
          className={`h-3 w-3 ${state === "processing" ? "animate-spin" : ""}`}
        />
        {config.label}
      </Badge>
    );
  },
};
