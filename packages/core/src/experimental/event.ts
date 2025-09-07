import { Actor } from "../helpers/actor";
import { Event } from "./bus/def";

export const defineEvent = Event.builder({
  validator: Event.zodValidator,
  metadata: () => {
    return {
      actor: Actor.use(),
    };
  },
});
