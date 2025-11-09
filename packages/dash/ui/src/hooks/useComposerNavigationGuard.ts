import { useBlocker } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useComposerStore } from "@/stores/composer-store";

/**
 * Hook to guard against accidental navigation away from composer with unsaved changes.
 *
 * Features:
 * - Blocks navigation if there are unsaved changes
 * - Shows custom confirmation dialog (via withResolver pattern)
 * - Prevents browser tab close/refresh with native browser dialog
 * - Provides proceed/reset callbacks for custom UI
 *
 * @example
 * ```tsx
 * function ComposerPage() {
 *   const { status, proceed, reset } = useComposerNavigationGuard();
 *
 *   return (
 *     <>
 *       <Composer />
 *       {status === 'blocked' && (
 *         <AlertDialog open>
 *           <AlertDialogContent>
 *             <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
 *             <AlertDialogDescription>
 *               You have unsaved changes. Are you sure you want to leave?
 *             </AlertDialogDescription>
 *             <AlertDialogFooter>
 *               <AlertDialogCancel onClick={reset}>Cancel</AlertDialogCancel>
 *               <AlertDialogAction onClick={proceed}>Leave</AlertDialogAction>
 *             </AlertDialogFooter>
 *           </AlertDialogContent>
 *         </AlertDialog>
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function useComposerNavigationGuard() {
  const hasUnsavedChanges = useComposerStore(
    (state) => state.hasUnsavedChanges,
  );
  const resetComposer = useComposerStore((state) => state.resetComposer);
  const [shouldBlock, setShouldBlock] = useState(false);

  // Update shouldBlock based on actual unsaved changes
  useEffect(() => {
    const checkChanges = () => {
      setShouldBlock(hasUnsavedChanges());
    };

    // Check immediately
    checkChanges();

    // Check on interval (to catch changes from store updates)
    const interval = setInterval(checkChanges, 100);

    return () => clearInterval(interval);
  }, [hasUnsavedChanges]);

  // Use TanStack Router's useBlocker with resolver pattern
  const blocker = useBlocker({
    shouldBlockFn: () => shouldBlock,
    withResolver: true,
    enableBeforeUnload: shouldBlock, // Enable native browser dialog for refresh/close
  });

  // Custom proceed that resets composer state
  const proceedWithReset = () => {
    resetComposer();
    blocker.proceed?.();
  };

  return {
    status: blocker.status,
    proceed: proceedWithReset,
    reset: blocker.reset,
    isBlocked: blocker.status === "blocked",
  };
}
