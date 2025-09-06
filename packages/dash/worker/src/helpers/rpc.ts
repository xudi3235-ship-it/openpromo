import { env } from "@openpromo/core/helpers/env";
import {
  type ClientOptions,
  createClient,
  createConfig,
} from "../generated/api/client";

export const createLiquidClient = () => {
  return createClient(
    createConfig<ClientOptions>({
      baseUrl: env.LIQUID_API_URL,
    }),
  );
};
