export type { OrpcContext, OrpcWorkspaceContext } from "./context";
export { orpcBuilder } from "./context";
export { withWorkspaceRole } from "./middleware";
export type {
  AgentRunsRouterInputs,
  AgentRunsRouterOutputs,
} from "./routes/agent-runs";
export { agentRunsRouter } from "./routes/agent-runs";
export { contentRouter } from "./routes/content/index";
export { inboxRouter } from "./routes/inbox";
export { insightsRouter } from "./routes/insights";
export { internalRouter } from "./routes/internal";
export {
  createPlanet,
  findPlanet,
  listPlanet,
  planetRouter,
} from "./routes/planet";
export { productsRouter } from "./routes/products";
export { listStyles, stylesRouter } from "./routes/styles";
export { workspacesRouter } from "./routes/workspaces";

import { getPostHogClient } from "@core/providers/posthog";
import { onError } from "@orpc/server";
import { orpcBuilder } from "./context";
import { agentRunsRouter as agentRuns } from "./routes/agent-runs";
import { contentRouter as content } from "./routes/content/index";
import { inboxRouter as inbox } from "./routes/inbox";
import { insightsRouter as insights } from "./routes/insights";
import { internalRouter as internal } from "./routes/internal";
import { planetRouter as planet } from "./routes/planet";
import { productVisualsRouter as productVisuals } from "./routes/product-visuals";
import { productsRouter as products } from "./routes/products";
import { stylesRouter as styles } from "./routes/styles";
import { workspacesRouter as workspaces } from "./routes/workspaces";

export const orpcRouter = orpcBuilder
  .use(
    onError(async (error, opts) => {
      console.error("oRPC Error:", error);
      const { honoContext: c } = opts.context;
      const user = c.get("user");
      const posthog = getPostHogClient();
      posthog.captureException(error, user?.id, {
        path: c.req.path,
        method: c.req.method,
        url: c.req.url,
        headers: c.req.header(),
      });
      await posthog.flush();
    }),
  )
  .router({
    content,
    agentRuns,
    planet,
    inbox,
    insights,
    productVisuals,
    styles,
    products,
    workspaces,
    internal,
  });
