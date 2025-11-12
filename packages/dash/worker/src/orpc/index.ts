export type { OrpcContext, OrpcWorkspaceContext } from "./context";
export { orpcBuilder } from "./context";
export { withWorkspaceRole } from "./middleware";
export { contentRouter } from "./routes/content/index";
export { imageGenRouter } from "./routes/image-gen";
export { inboxRouter } from "./routes/inbox";
export { insightsRouter } from "./routes/insights";
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
import { contentRouter as content } from "./routes/content/index";
import { imageGenRouter as imageGen } from "./routes/image-gen";
import { inboxRouter as inbox } from "./routes/inbox";
import { insightsRouter as insights } from "./routes/insights";
import { planetRouter as planet } from "./routes/planet";
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
    planet,
    inbox,
    insights,
    imageGen,
    styles,
    products,
    workspaces,
  });
