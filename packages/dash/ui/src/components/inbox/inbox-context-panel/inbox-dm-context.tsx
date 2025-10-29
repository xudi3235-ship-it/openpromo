import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Separator } from "@openpromo/ui/components/separator";
import type { InboxConversationSummary } from "@shared/inbox";
import { Clock, FileText, Tag, UserCircle } from "lucide-react";

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

        {/* Assignee Section - Placeholder */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Assigned To</h3>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-6 text-center">
            <UserCircle className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              Assignee feature coming soon
            </p>
            <Button variant="ghost" size="sm" className="mt-2" disabled>
              Assign to team member
            </Button>
          </div>
        </div>

        <Separator />

        {/* Labels Section - Placeholder */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Labels</h3>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-6 text-center">
            <Tag className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">No labels applied</p>
            <Button variant="ghost" size="sm" className="mt-2" disabled>
              Add label
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
