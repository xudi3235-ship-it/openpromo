import { Event } from "./bus/def";

export const defineEvent = Event.builder({
  validator: Event.zodValidator,
});
