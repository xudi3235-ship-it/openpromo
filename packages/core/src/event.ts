import { Actor } from "./actor";
import { Event } from "./experimental/bus/def";

export const defineEvent = Event.builder({
  validator: Event.zodValidator,
  metadata: () => {
    return {
      actor: Actor.use(),
    };
  },
});
