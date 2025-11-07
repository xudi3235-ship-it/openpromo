import { Link } from "@tanstack/react-router";
import { Calendar, PenSquare, Zap } from "lucide-react";

type HomeQuickActionsProps = {
  workspaceSlug: string;
};

const ACTIONS = [
  {
    label: "Plan calendar",
    description: "Fill empty slots for the week",
    icon: Calendar,
    href: "/workspaces/$workspaceSlug/calendar",
  },
  {
    label: "Open composer",
    description: "Repurpose a top performing post",
    icon: PenSquare,
    href: "/workspaces/$workspaceSlug/composer",
  },
  {
    label: "Automations",
    description: "Check your styles & presets",
    icon: Zap,
    href: "/workspaces/$workspaceSlug/styles",
  },
];

export function HomeQuickActions({ workspaceSlug }: HomeQuickActionsProps) {
  return (
    <div className="bg-card border border-border/40 rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-medium text-foreground">Quick actions</h2>
      <div className="space-y-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.href}
              params={{ workspaceSlug }}
              className="flex items-center gap-3 p-3 rounded-lg border border-border/30 hover:bg-muted/40 transition"
            >
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {action.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
