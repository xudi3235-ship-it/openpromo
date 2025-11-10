export type { OrpcContext, OrpcWorkspaceContext } from "./context";
export { orpcBuilder } from "./context";
export { withWorkspaceRole } from "./middleware";
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

import { imageGenRouter } from "./routes/image-gen";
import { inboxRouter } from "./routes/inbox";
import { insightsRouter } from "./routes/insights";
import { planetRouter } from "./routes/planet";
import { productsRouter } from "./routes/products";
import { stylesRouter } from "./routes/styles";
import { workspacesRouter } from "./routes/workspaces";

export const orpcRouter = {
  planet: planetRouter,
  inbox: inboxRouter,
  insights: insightsRouter,
  imageGen: imageGenRouter,
  styles: stylesRouter,
  products: productsRouter,
  workspaces: workspacesRouter,
};
