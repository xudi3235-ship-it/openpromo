import { useRouterState } from "@tanstack/react-router";

const DISABLED_PATTERNS: RegExp[] = [
  /^\/workspaces\/[^/]+\/?$/,
  /^\/workspaces\/[^/]+\/composer\/?$/,
];

export function useShouldShowAccountsBar(override?: boolean): boolean {
  const { location } = useRouterState();
  if (typeof override === "boolean") return override;

  const pathname = location.pathname;

  const isDisabled = DISABLED_PATTERNS.some((pattern) =>
    pattern.test(pathname),
  );
  return !isDisabled;
}
