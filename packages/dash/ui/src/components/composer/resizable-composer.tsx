import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@openpromo/ui/components/resizable";
import type { ConnectedAccount } from "@/lib/hono-client";
import { ComposerProvider } from "@/providers/composer-provider";
import { ComposerLeft } from "./composer-left";
import { ComposerRight } from "./composer-right";

interface ResizableComposerProps {
  accounts: ConnectedAccount[];
  className?: string;
}

export function ResizableComposer({
  accounts,
  className = "",
}: ResizableComposerProps) {
  return (
    <ComposerProvider
      initialAccounts={accounts}
      initialPlacementSelected="ALL"
      initialSelectedPreview="FACEBOOK"
      initialMessage="Hello world!"
    >
      <ResizablePanelGroup
        direction="horizontal"
        className={`h-full ${className}`}
      >
        <ResizablePanel defaultSize={40} minSize={30} maxSize={60}>
          <ComposerLeft />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60}>
          <ComposerRight />
        </ResizablePanel>
      </ResizablePanelGroup>
    </ComposerProvider>
  );
}
