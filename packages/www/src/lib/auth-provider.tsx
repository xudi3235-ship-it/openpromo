import type { MyEnv } from "@openpromo/functions/src/api/routes";
import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext } from "react";
import { apiClient } from "./hono-client";

interface AuthContextType {
  user: MyEnv["Variables"]["user"];
  isLoading: boolean;
}

const AuthContext = createContext({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["user.me"],
    queryFn: async () => {
      const res = await apiClient.user.me.$get();
      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }
      return res.json();
    },
    retry: false,
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
      }}
    >
      {isLoading ? "Loading..." : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
