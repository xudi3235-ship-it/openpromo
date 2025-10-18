import { MessageSquare } from "lucide-react";

export function InboxEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full border border-border bg-muted/40 p-4">
        <MessageSquare className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Select a conversation</h2>
        <p className="text-sm text-muted-foreground">
          Choose a conversation on the left to view messages. New message
          actions are coming soon.
        </p>
      </div>
    </div>
  );
}
