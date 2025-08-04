import { createClient } from "@openauthjs/openauth/client";
import Cookies from "js-cookie";
import { Resource } from "sst";

// You may need to adjust the issuer URL depending on your deployment
export const authClient = createClient({
  clientID: "www_v2", // or your actual client id
  issuer: `${Resource.Urls.api}/api/auth`, // or Resource.Auth.url if available
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
