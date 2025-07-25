import z from "zod/v4";
import { Common } from "../common";
import { Examples } from "../examples";

export namespace User {
  export const Info = z
    .object({
      id: z.string().meta({
        description: Common.IdDescription,
        example: Examples.User.id,
      }),
      name: z.string().nullable().meta({
        description: "Name of the user.",
        example: Examples.User.name,
      }),
      email: z.string().nullable().meta({
        description: "Email address of the user.",
        example: Examples.User.email,
      }),
      stripeCustomerID: z.string().meta({
        description: "Stripe customer ID of the user.",
        example: Examples.User.stripeCustomerID,
      }),
    })
    .meta({
      ref: "User",
      description: "A Terminal shop user. (We have users, btw.)",
      example: Examples.User,
    });
}
