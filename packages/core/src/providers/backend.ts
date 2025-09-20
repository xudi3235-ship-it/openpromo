import { env } from "@core/utils/env";
import OpenpromoBackend from "openpromo-backend";

// sdk to our modal backend
const opClient = new OpenpromoBackend({
  apiKey: env.MODAL_PROXY_AUTH_TOKEN_ID,
  secret: env.MODAL_PROXY_AUTH_TOKEN_SECRET,
});

export default opClient;
