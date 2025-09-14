import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@openpromo/ui/components/resizable";
import type { ConnectedAccount } from "@/lib/hono-client";
import { ComposerProvider } from "@/providers/composer-provider";
import type { ComposerProps } from "@/stores/composer-store";
import { ComposerLeft } from "./composer-left";
import { ComposerRight } from "./composer-right";

interface ResizableComposerProps {
  accounts: ConnectedAccount[];
  className?: string;
  initComposerProps?: Partial<ComposerProps>;
}

export function ResizableComposer({
  accounts,
  className = "",
  initComposerProps,
}: ResizableComposerProps) {
  const props = {
    ...initComposerProps,
    initialAccounts: accounts,
    initialMessage: "caption your post here...",
  } as ComposerProps;
  return (
    <ComposerProvider {...props}>
      <div className={`relative h-full ${className}`}>
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={40} minSize={30} maxSize={60}>
            <ComposerLeft />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60}>
            <ComposerRight />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </ComposerProvider>
  );
}
