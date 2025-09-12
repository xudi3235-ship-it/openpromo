import { useRef } from "react";
import {
  ComposerContext,
  type ComposerProps,
  type ComposerStore,
  createComposerStore,
} from "@/stores/composer-store";

// Provider component props
type ComposerProviderProps = React.PropsWithChildren<ComposerProps>;

export function ComposerProvider({
  children,
  ...props
}: ComposerProviderProps) {
  const storeRef = useRef<ComposerStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createComposerStore(props);
  }

  return (
    <ComposerContext.Provider value={storeRef.current}>
      {children}
    </ComposerContext.Provider>
  );
}
