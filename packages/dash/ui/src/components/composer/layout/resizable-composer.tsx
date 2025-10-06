import type { ConnectedAccount } from "@/lib/hono-client";
import { ComposerProvider } from "@/providers/composer-provider";
import type { ComposerProps } from "@/stores/composer-store";
import { ComposerLeft } from "./composer-left";
import { ComposerRight } from "./composer-right";
import { TwoColumnLayout } from "./two-column-layout";

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
    initialMessage: "",
  } as ComposerProps;
  return (
    <ComposerProvider {...props}>
      <TwoColumnLayout
        left={<ComposerLeft />}
        right={<ComposerRight />}
        className={className}
      />
    </ComposerProvider>
  );
}
