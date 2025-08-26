import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  convertHonoQueryOptions,
  type UseHonoQueryOptions,
  type User,
  useHonoQuery,
} from "@/lib/hono-client";
import { QUERY_KEYS } from "@/lib/query";

const userQueryOptions: UseHonoQueryOptions<User> = {
  queryKey: QUERY_KEYS.USER,
  queryFn: (api) => api.users.me.$get(),
  disableErrorToast: true,
  retry: false,
  retryOnMount: false,
  staleTime: 1000 * 60 * 5, // 5 minutes
};

export const useAuth = () => {
  const auth = useHonoQuery(userQueryOptions);
  const queryClient = useQueryClient();

  const fetchData = useCallback(async () => {
    return queryClient.fetchQuery(convertHonoQueryOptions(userQueryOptions));
  }, [queryClient.fetchQuery]);

  return { ...auth, fetchData };
};

export type AuthContext = ReturnType<typeof useAuth>;
