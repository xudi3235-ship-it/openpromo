import type { WorkspaceNotificationEnvelope } from "@shared/workspace";
import { Link } from "@tanstack/react-router";
import { mapNotificationToDisplay } from "./notification-mapper";
import { formatTimestamp } from "./utils";

type NotificationItemProps = {
  envelope: WorkspaceNotificationEnvelope;
  workspaceSlug: string;
};

export function NotificationItem({
  envelope,
  workspaceSlug,
}: NotificationItemProps) {
  const meta = mapNotificationToDisplay(envelope, workspaceSlug);

  return (
    <li className="px-4 py-3 text-sm">
      <div className="flex items-start gap-3">
        <span className="mt-1 text-muted-foreground">{meta.icon}</span>
        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium leading-none text-foreground">
              {meta.title}
            </p>
            <time
              dateTime={new Date(envelope.timestamp).toISOString()}
              className="shrink-0 text-xs text-muted-foreground"
            >
              {formatTimestamp(envelope.timestamp)}
            </time>
          </div>
          {meta.description && (
            <p className="text-xs text-muted-foreground">{meta.description}</p>
          )}
          {meta.href &&
            (meta.href.type === "route" ? (
              <Link
                to={meta.href.to}
                params={meta.href.params}
                className="inline-flex text-xs font-medium text-primary hover:underline"
              >
                {meta.href.label}
              </Link>
            ) : (
              <a
                href={meta.href.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-xs font-medium text-primary hover:underline"
              >
                {meta.href.label}
              </a>
            ))}
        </div>
      </div>
    </li>
  );
}
