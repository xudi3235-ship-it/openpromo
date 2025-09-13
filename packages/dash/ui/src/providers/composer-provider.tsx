import {
  ComposerContext,
  type ComposerProps,
  createComposerStore,
} from "@/stores/composer";

type ComposerStoreInstance = ReturnType<typeof createComposerStore>;

import { useRef } from "react";

type ComposerProviderProps = React.PropsWithChildren<ComposerProps>;

export function ComposerProvider({
  children,
  ...props
}: ComposerProviderProps) {
  const storeRef = useRef<ComposerStoreInstance | null>(null);

  if (!storeRef.current) {
    storeRef.current = createComposerStore(props);
  }

  return (
    <ComposerContext.Provider value={storeRef.current}>
      {children}
    </ComposerContext.Provider>
  );
}
