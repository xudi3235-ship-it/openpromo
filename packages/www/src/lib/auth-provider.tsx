import { createClient } from "@openauthjs/openauth/client";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createApiClient } from "./hono-client";

const client = createClient({
  clientID: "openpromo-www",
  issuer: import.meta.env.VITE_AUTH_URL,
});

interface Workspace {
  id: string;
  workspaceID: string;
  name: string | null;
}

interface AuthContextType {
  userId?: string;
  workspaceId?: string;
  availableWorkspaces?: Array<Workspace>;
  loaded: boolean;
  loggedIn: boolean;
  logout: () => void;
  login: () => Promise<void>;
  getToken: () => Promise<string | undefined>;
  switchWorkspace?: (workspaceID: string) => Promise<void>;
  getApiClient: () => ReturnType<typeof createApiClient>;
}

const AuthContext = createContext({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const initializing = useRef(true);
  const [loaded, setLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const token = useRef<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | undefined>();
  const [workspaceId, setWorkspaceId] = useState<string | undefined>();
  const [availableWorkspaces, setAvailableWorkspaces] = useState<
    Array<Workspace>
  >([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: TODO
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");

    if (!initializing.current) {
      return;
    }

    initializing.current = false;

    if (code && state) {
      callback(code, state);
      return;
    }

    auth();
  }, []);

  async function auth() {
    const token = await refreshTokens();

    if (token) {
      try {
        await user();
      } catch (error) {
        console.error("Failed to fetch user in auth flow:", error);
      }
    }
    setLoaded(true);
  }

  async function refreshTokens() {
    const refresh = localStorage.getItem("refresh");
    if (!refresh) return;

    const next = await client.refresh(refresh, {
      access: token.current,
    });

    if (next.err) {
      console.error("Refresh token error:", next.err);
      return;
    }

    if (!next.tokens) {
      return token.current;
    }

    localStorage.setItem("refresh", next.tokens.refresh);
    token.current = next.tokens.access;

    return next.tokens.access;
  }

  async function getToken() {
    const token = await refreshTokens();

    if (!token) {
      await login();
      return;
    }

    return token;
  }

  async function login() {
    const { challenge, url } = await client.authorize(location.origin, "code", {
      pkce: true,
    });
    sessionStorage.setItem("challenge", JSON.stringify(challenge));
    location.href = url;
  }

  async function callback(code: string, state: string) {
    const challengeData = sessionStorage.getItem("challenge");
    if (!challengeData) {
      console.error("No challenge found in sessionStorage");
      window.location.replace("/");
      return;
    }

    const challenge = JSON.parse(challengeData);
    if (code) {
      if (state === challenge.state && challenge.verifier) {
        const exchanged = await client.exchange(
          code,
          location.origin,
          challenge.verifier,
        );

        if (!exchanged.err && exchanged.tokens) {
          token.current = exchanged.tokens.access;
          localStorage.setItem("refresh", exchanged.tokens.refresh);

          // Fetch user data after successful token exchange
          try {
            await user();
          } catch (error) {
            console.error("Failed to fetch user data:", error);
            // Don't silently handle this error - it's critical
            setLoaded(true); // Still mark as loaded even if user fetch fails
          }
        } else {
          console.error("Token exchange failed:", exchanged.err);
          setLoaded(true);
        }
      } else {
        console.error(
          "State mismatch or missing verifier. Expected state:",
          challenge.state,
          "Got:",
          state,
        );
        setLoaded(true);
      }
      window.location.replace("/");
    }
  }

  function getApiClient() {
    const authToken = token.current;
    if (!authToken) {
      throw new Error("Authentication token is required to use API client");
    }
    return createApiClient(authToken);
  }

  async function user() {
    try {
      const apiClient = getApiClient();
      // @ts-ignore
      const res = await apiClient.user.me.$get();

      if (!res.ok) {
        const errorText = await res.text();
        console.error("User API error response:", errorText);
        throw new Error(
          `Failed to fetch user data: ${res.status} ${errorText}`,
        );
      }

      const userData = await res.json();
      setUserId(userData.id);
      setWorkspaceId(userData.currentWorkspaceID);
      setAvailableWorkspaces(userData.availableWorkspaces || []);
      setLoggedIn(true);
      setLoaded(true);
    } catch (error) {
      console.error("Error in user() function:", error);
      setLoggedIn(false);
      setLoaded(true);
      throw error;
    }
  }

  async function switchWorkspace(targetWorkspaceID: string) {
    // This would require generating a new token for the target workspace
    // For now, we'll store the preference and require re-login
    localStorage.setItem("preferred-workspace", targetWorkspaceID);

    // You might want to implement a proper workspace switching endpoint
    // that issues a new token with the target workspace context
    await logout();
  }

  function logout() {
    localStorage.removeItem("refresh");
    token.current = undefined;

    window.location.replace("/");
  }

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        userId,
        workspaceId,
        availableWorkspaces,
        loaded,
        loggedIn,
        getToken,
        switchWorkspace,
        getApiClient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
