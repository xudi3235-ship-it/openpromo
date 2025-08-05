import { createClient } from "@openauthjs/openauth/client";
import { nullThrows } from "@openpromo/js-shared/common";
import Cookies from "js-cookie";

const issuer = nullThrows(
  import.meta.env.VITE_AUTH_URL,
  "VITE_AUTH_URL is not set",
);
export const authClient = createClient({
  clientID: "www_v2",
  issuer,
});

export function setTokens(access: string, refresh: string) {
  Cookies.set("access_token", access, {
    sameSite: "lax",
    path: "/",
    expires: 400, // days
  });

  Cookies.set("refresh_token", refresh, {
    sameSite: "lax",
    path: "/",
    expires: 400, // days
  });
}
