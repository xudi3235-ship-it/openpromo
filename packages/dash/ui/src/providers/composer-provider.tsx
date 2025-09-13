import { useRef } from "react";
import {
  ComposerContext,
  type ComposerProps,
  createComposerStore,
} from "@/stores/composer-store";

type ComposerStoreInstance = ReturnType<typeof createComposerStore>;
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
