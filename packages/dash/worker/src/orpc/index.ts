export type { OrpcContext } from "./context";
export { orpcBuilder } from "./context";

export {
  createPlanet,
  findPlanet,
  listPlanet,
  planetRouter,
} from "./routes/planet";

import { planetRouter } from "./routes/planet";

export const orpcRouter = {
  planet: planetRouter,
};
