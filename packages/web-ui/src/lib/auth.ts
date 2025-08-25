import { AUTH_BASE_URL } from "@/constants";

export function login(returnTo?: string) {
  const target =
    returnTo ??
    `${window.location.pathname}${window.location.search}${window.location.hash}`;

  const url = new URL(`${AUTH_BASE_URL}/login`, window.location.origin);

  url.searchParams.set("returnTo", target);

  window.location.href = url.pathname + url.search;
}

export function logout() {
  window.location.href = `${AUTH_BASE_URL}/logout`;
}
