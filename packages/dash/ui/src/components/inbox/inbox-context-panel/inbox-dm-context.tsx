import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Separator } from "@openpromo/ui/components/separator";
import type { InboxConversationSummary } from "@shared/inbox";
import { Clock, FileText, Plus, Sparkles, Tag, UserCircle } from "lucide-react";

interface InboxDMContextProps {
  conversation: InboxConversationSummary;
}

export function InboxDMContext({ conversation }: InboxDMContextProps) {
  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-4 p-4">
        {/* Conversation Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Conversation Info</h3>
            <Badge variant="outline" className="text-xs">
              {conversation.platform}
            </Badge>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Last Message:</span>
              <span>
                {new Date(conversation.lastMessageAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Thread ID:</span>
              <span className="font-mono text-xs">
                {conversation.externalThreadId?.slice(0, 12)}...
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Summary Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">AI Summary</h3>
            <Button variant="ghost" size="sm" disabled>
              <Sparkles className="mr-1 h-3 w-3" />
              Generate
            </Button>
          </div>
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">
              AI-powered conversation summaries coming soon. This will help you
              quickly understand the context and key points of long
              conversations.
            </p>
          </div>
        </div>

        <Separator />

        {/* Labels Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Labels</h3>
            <Button variant="ghost" size="sm" disabled>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
            <Tag className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              No labels applied yet
            </p>
          </div>
        </div>

        <Separator />

        {/* Assignee Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Assigned To</h3>
          <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
            <UserCircle className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">Not assigned</p>
            <Button variant="ghost" size="sm" className="mt-2" disabled>
              Assign
            </Button>
          </div>
        </div>

        <Separator />

        {/* Notes Section - Placeholder */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Internal Notes</h3>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-6 text-center">
            <FileText className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">No notes yet</p>
            <Button variant="ghost" size="sm" className="mt-2" disabled>
              Add note
            </Button>
          </div>
        </div>

        <Separator />

        {/* Activity Timeline - Placeholder */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Recent Activity</h3>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-6 text-center">
            <Clock className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              Activity log coming soon
            </p>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
