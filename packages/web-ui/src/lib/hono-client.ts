import type { ApiRoutes, AuthRoutes } from "@openpromo/web-api/src/types";
import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
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

const withErrorHandling = async <T extends object>(
  request: Promise<ClientResponse<T, ContentfulStatusCode, "json">>,
  options?: {
    disableErrorToast?: boolean;
  },
): Promise<ApiResponse<T>> => {
  const response = await request;
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
      const res = await withErrorHandling(options.queryFn(apiClient), {
        disableErrorToast,
      });
      if (res.success) {
        return res.data;
      }
      throw new Error(res.error.message);
    },
  });
};
