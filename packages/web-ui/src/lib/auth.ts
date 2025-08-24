import { useMutation } from "@tanstack/react-query";
import { AUTH_BASE_URL } from "@/constants";
import { authClient } from "@/lib/hono-client";

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

// Send PIN mutation
export const useSendPinMutation = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await authClient["magic-auth"].send.$post({
        json: { email },
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to send verification code");
      }

      return data;
    },
    onError: (error) => {
      console.error("Send pin error:", error);
    },
  });
};

// Verify PIN mutation
export const useVerifyPinMutation = () => {
  return useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      const res = await authClient["magic-auth"].verify.$post({
        json: { email, code },
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Invalid verification code");
      }

      return data;
    },
    onSuccess: () => {
      // Redirect to workspaces on successful authentication
      window.location.href = "/workspaces";
    },
    onError: (error) => {
      console.error("Verify pin error:", error);
    },
  });
};
