export type { OrpcContext, OrpcWorkspaceContext } from "./context";
export { orpcBuilder } from "./context";
export { withWorkspaceRole } from "./middleware";
export { inboxRouter } from "./routes/inbox";
export { insightsRouter } from "./routes/insights";
export {
  createPlanet,
  findPlanet,
  listPlanet,
  planetRouter,
} from "./routes/planet";

import { inboxRouter } from "./routes/inbox";
import { insightsRouter } from "./routes/insights";
import { planetRouter } from "./routes/planet";

export const orpcRouter = {
  planet: planetRouter,
  inbox: inboxRouter,
  insights: insightsRouter,
};
