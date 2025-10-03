import type { PlacementSpec } from "@shared/content";
import {
  type UseMutationOptions,
  type UseQueryOptions,
  type UseSuspenseQueryOptions,
  useMutation,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type {
  ContentEntity,
  GroupEntity,
  MergedContentEntity,
} from "@worker/routes/api/workspaces/content";
import { hcWithType } from "@worker/types";
import type { ClientResponse } from "hono/client";
import { toast } from "sonner";
import { API_BASE_URL } from "@/constants";

// export const apiClient = hc<ApiRoutes>(API_BASE_URL);
export const apiClient = hcWithType(API_BASE_URL);

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
    case 503:
      return "Service unavailable";
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
        status: number;
        message: string;
      };
    };

export const honoApiCall = async <T extends object>(
  request: (
    api: typeof apiClient,
  ) => Promise<ClientResponse<T, number, "json">>,
  options?: {
    disableErrorToast?: boolean;
    errorMessage?: string;
  },
): Promise<ApiResponse<T>> => {
  const response = await request(apiClient);

  let json: T | null = null;
  try {
    json = await response.json();
  } catch {
    // parsing failed, leave json = null
  }

  if (response.ok) {
    return {
      success: true,
      data: json as T,
    };
  }

  const errorMessage =
    options?.errorMessage ??
    (json && "message" in json
      ? (json.message as string)
      : getDefaultErrorMessage(response.status));

  if (!options?.disableErrorToast) {
    toast.error(errorMessage);
  }

  return {
    success: false,
    error: {
      status: response.status,
      message: errorMessage,
    },
  };
};

export interface UseHonoQueryOptions<T extends object>
  extends Omit<UseQueryOptions<T>, "queryFn"> {
  queryFn: (
    api: typeof apiClient,
  ) => Promise<ClientResponse<T, number, "json">>;
  disableErrorToast?: boolean;
  errorMessage?: string;
}

export const convertHonoQueryOptions = <T extends object>(
  options: UseHonoQueryOptions<T>,
) => {
  const { queryFn, disableErrorToast, errorMessage, ...useQueryOptions } =
    options;
  return {
    ...useQueryOptions,
    queryFn: async () => {
      const res = await honoApiCall(queryFn, {
        disableErrorToast,
        errorMessage,
      });
      if (res.success) {
        return res.data;
      }
      throw new Error(res.error.message);
    },
  };
};

export const useHonoQuery = <T extends object>(
  options: UseHonoQueryOptions<T>,
) => {
  return useQuery<T>(convertHonoQueryOptions(options));
};

interface UseHonoMutationOptions<T extends object, V>
  extends Omit<UseMutationOptions<T, Error, V>, "mutationFn"> {
  mutationFn: (
    api: typeof apiClient,
    variables: V,
  ) => Promise<ClientResponse<T, number, "json">>;
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

interface UseHonoSuspenseQueryOptions<T extends object>
  extends Omit<UseSuspenseQueryOptions<T>, "queryFn"> {
  queryFn: (
    api: typeof apiClient,
  ) => Promise<ClientResponse<T, number, "json">>;
  disableErrorToast?: boolean;
  errorMessage?: string;
}

export const useHonoSuspenseQuery = <T extends object>(
  options: UseHonoSuspenseQueryOptions<T>,
) => {
  const {
    queryFn,
    disableErrorToast,
    errorMessage,
    ...useSuspenseQueryOptions
  } = options;
  return useSuspenseQuery<T>({
    ...useSuspenseQueryOptions,
    queryFn: async () => {
      const res = await honoApiCall(queryFn, {
        disableErrorToast,
        errorMessage,
      });
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
  T extends (
    // biome-ignore lint/suspicious/noExplicitAny: lib
    ...args: any[]
  ) => Promise<ClientResponse<unknown, number, "json">>,
> = Awaited<ReturnType<Awaited<ReturnType<T>>["json"]>>;

// ------- types -------
export type User = ApiResult<typeof apiClient.users.me.$get>;
export type Org = ApiResult<typeof apiClient.orgs.$get>[0];
export type Workspace = ApiResult<typeof apiClient.workspaces.$get>[0];
export type ConnectedAccount = ApiResult<
  (typeof apiClient.workspaces)[":workspaceSlug"]["connected_accounts"]["$get"]
>["accounts"][0];
export type ContentListResponse = ApiResult<
  (typeof apiClient.workspaces)[":workspaceSlug"]["content"]["$get"]
>;

export function matchEntity<T>(
  entity: MergedContentEntity,
  handlers: {
    group: (entity: GroupEntity) => T;
    content: (entity: ContentEntity) => T;
  },
): T {
  switch (entity.type) {
    case "group":
      return handlers.group(entity);
    case "content":
      return handlers.content(entity);
    default:
      throw new Error("Unknown entity type");
  }
}

export function matchPlacementSpec<T>(
  spec: PlacementSpec,
  handlers: {
    FBFeed: (spec: Extract<PlacementSpec, { placement: "FB_FEED" }>) => T;
    IGFeed: (spec: Extract<PlacementSpec, { placement: "IG_FEED" }>) => T;
    TTFeed: (spec: Extract<PlacementSpec, { placement: "TT_FEED" }>) => T;
  },
) {
  switch (spec.placement) {
    case "FB_FEED":
      return handlers.FBFeed(
        spec as Extract<PlacementSpec, { placement: "FB_FEED" }>,
      );
    case "IG_FEED":
      return handlers.IGFeed(
        spec as Extract<PlacementSpec, { placement: "IG_FEED" }>,
      );
    case "TT_FEED":
      return handlers.TTFeed(
        spec as Extract<PlacementSpec, { placement: "TT_FEED" }>,
      );
    default:
      throw new Error("Unknown placement spec");
  }
}
