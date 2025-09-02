import { env } from "@openpromo/core/env/index";
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
