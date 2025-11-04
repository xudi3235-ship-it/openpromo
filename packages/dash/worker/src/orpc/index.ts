export type { OrpcContext, OrpcWorkspaceContext } from "./context";
export { orpcBuilder, withWorkspaceRole } from "./context";
export { deleteConversation, inboxRouter } from "./routes/inbox";
export {
  createPlanet,
  findPlanet,
  listPlanet,
  planetRouter,
} from "./routes/planet";

import { inboxRouter } from "./routes/inbox";
import { planetRouter } from "./routes/planet";

export const orpcRouter = {
  planet: planetRouter,
  inbox: inboxRouter,
};
