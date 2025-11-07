import type {
  InsightGoalSummary,
  InsightNarrativeHighlight,
} from "@shared/insights";
import { Lightbulb } from "lucide-react";
import { MomentumCard } from "@/components/momentum/MomentumCard";

type InsightsNextActionsProps = {
  goals?: InsightGoalSummary[];
  highlights?: InsightNarrativeHighlight[];
};

function buildActions(
  goals?: InsightGoalSummary[],
  highlights?: InsightNarrativeHighlight[],
) {
  const actions: { title: string; description: string }[] = [];

  goals?.forEach((goal) => {
    const progress = goal.progressPercent ?? 0;
    if (progress < 0.5) {
      actions.push({
        title: "Stay on track",
        description: `You are ${(progress * 100).toFixed(0)}% toward your goal. Queue another post to close the gap.`,
      });
    } else if ((goal.streak ?? 0) > 0) {
      actions.push({
        title: "Keep the streak",
        description: `Maintain your ${goal.streak} week streak by publishing on schedule.`,
      });
    }
  });

  if (!actions.length && highlights && highlights.length > 0) {
    actions.push({
      title: "Double down",
      description:
        highlights[0].body ??
        "Replicate your recent win by reusing the top performing creative.",
    });
  }

  return actions;
}

export function InsightsNextActions({
  goals,
  highlights,
}: InsightsNextActionsProps) {
  const actions = buildActions(goals, highlights);

  return (
    <MomentumCard className="space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-muted-foreground" />
        <div>
          <h2 className="font-medium text-foreground">Next best actions</h2>
          <p className="text-xs text-muted-foreground">
            Suggestions based on your current progress
          </p>
        </div>
      </div>
      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Keep publishing and we&apos;ll surface personalized suggestions.
        </p>
      ) : (
        <ul className="space-y-3">
          {actions.map((action, idx) => (
            <li
              key={`${action.title}-${idx}`}
              className="rounded-2xl border border-border/40 p-4"
            >
              <p className="text-sm font-medium text-foreground mb-1">
                {action.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {action.description}
              </p>
            </li>
          ))}
        </ul>
      )}
    </MomentumCard>
  );
}
