import { Resource } from "sst";
import {
  type ClientOptions,
  createClient,
  createConfig,
} from "../generated/api/client";

export const createLiquidClient = () => {
  return createClient(
    createConfig<ClientOptions>({
      baseUrl: Resource.LIQUID_API_URL.value,
    }),
  );
};
