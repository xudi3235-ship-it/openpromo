import type { ApiRoutes, AuthRoutes } from "@openpromo/web-api/src/types";
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { type ClientResponse, hc } from "hono/client";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { toast } from "sonner";
import { API_BASE_URL, AUTH_BASE_URL } from "@/constants";

export const apiClient = hc<ApiRoutes>(API_BASE_URL);
export const authClient = hc<AuthRoutes>(AUTH_BASE_URL);

function getDefaultErrorMessage(status: number) {
  switch (status) {
    case 400:
      return "Invalid request";
    case 401:
      return "Unauthenticated";
    case 403:
      return "Access denied";
    case 404:
      return "Resource not found";
    case 500:
      return "Internal server error";
  }
  return "Unknown error";
}

type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: {
        message: string;
      };
    };

export const honoApiCall = async <T extends object>(
  request: (
    api: typeof apiClient,
  ) => Promise<ClientResponse<T, ContentfulStatusCode, "json">>,
  options?: {
    disableErrorToast?: boolean;
  },
): Promise<ApiResponse<T>> => {
  const response = await request(apiClient);
  const json = await response.json();

  if (response.ok) {
    return {
      success: true,
      data: json,
    };
  }

  const errorMessage =
    "message" in json
      ? (json.message as string)
      : getDefaultErrorMessage(response.status);

  if (!options?.disableErrorToast) {
    toast.error(errorMessage);
  }

  return {
    success: false,
    error: { message: errorMessage },
  };
};

interface UseHonoQueryOptions<T extends object>
  extends Omit<UseQueryOptions<T>, "queryFn"> {
  queryFn: (
    api: typeof apiClient,
  ) => Promise<ClientResponse<T, ContentfulStatusCode, "json">>;
  disableErrorToast?: boolean;
}

export const useHonoQuery = <T extends object>(
  options: UseHonoQueryOptions<T>,
) => {
  const { disableErrorToast, ...useQueryOptions } = options;
  return useQuery<T>({
    ...useQueryOptions,
    queryFn: async () => {
      const res = await honoApiCall(options.queryFn, {
        disableErrorToast,
      });
      if (res.success) {
        return res.data;
      }
      throw new Error(res.error.message);
    },
  });
};

interface UseHonoMutationOptions<T extends object, V>
  extends Omit<UseMutationOptions<T, Error, V>, "mutationFn"> {
  mutationFn: (
    api: typeof apiClient,
    variables: V,
  ) => Promise<ClientResponse<T, ContentfulStatusCode, "json">>;
  disableErrorToast?: boolean;
}

export const useHonoMutation = <T extends object, V>(
  options: UseHonoMutationOptions<T, V>,
) => {
  const { disableErrorToast, ...useMutationOptions } = options;
  return useMutation<T, Error, V>({
    ...useMutationOptions,
    mutationFn: async (variables) => {
      const res = await honoApiCall(
        (api) => options.mutationFn(api, variables),
        {
          disableErrorToast,
        },
      );
      if (res.success) {
        return res.data;
      }
      throw new Error(res.error.message);
    },
  });
};

/**
 * Helper type utility that extracts the result type from an API client method
 * @example
 * type User = ApiResult<typeof apiClient.users.me.$get>;
 * type Workspace = ApiResult<typeof apiClient.workspaces.$get>;
 */
export type ApiResult<
  T extends () => Promise<
    ClientResponse<unknown, ContentfulStatusCode, "json">
  >,
> = Awaited<ReturnType<Awaited<ReturnType<T>>["json"]>>;

export type User = ApiResult<typeof apiClient.users.me.$get>;
export type Org = ApiResult<typeof apiClient.orgs.$get>[0];
