import { subjects } from "@openpromo/functions/src/auth/subjects";
import { redirect } from "@tanstack/react-router";
import Cookies from "js-cookie";
import { authClient, setTokens } from "./auth-client";

export async function auth() {
  const accessToken = Cookies.get("access_token");
  const refreshToken = Cookies.get("refresh_token");

  if (!accessToken) {
    return false;
  }

  const verified = await authClient.verify(subjects, accessToken, {
    refresh: refreshToken,
  });

  if (verified.err) {
    return false;
  }
  if (verified.tokens) {
    setTokens(verified.tokens.access, verified.tokens.refresh);
  }

  return verified.subject;
}

export async function login(provider: string, email?: string) {
  const accessToken = Cookies.get("access_token");
  const refreshToken = Cookies.get("refresh_token");

  if (accessToken) {
    const verified = await authClient.verify(subjects, accessToken, {
      refresh: refreshToken,
    });
    if (!verified.err && verified.tokens) {
      setTokens(verified.tokens.access, verified.tokens.refresh);
      redirect({ to: "/" });
    }
  }

  const { url } = await authClient.authorize(
    `${import.meta.env.VITE_AUTH_URL}/callback`,
    "code",
    {
      provider,
      ...(email && { claims: { email } }),
    },
  );
  redirect({ to: url });
}

export async function logout() {
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");

  redirect({ to: "/" });
}
