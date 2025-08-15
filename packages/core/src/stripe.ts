import { eq } from "drizzle-orm";
import { Resource } from "sst";
import { Stripe as StripeClient } from "stripe";
import { z } from "zod";
import { useTransaction } from "./drizzle/transaction";
import { userTable } from "./user/user.sql";
import { fn } from "./util/fn";

export const stripe = new StripeClient(Resource.STRIPE_SECRET_KEY.value, {
  httpClient: StripeClient.createFetchHttpClient(),
});

export namespace Stripe {
  export const client = stripe;

  export const syncUser = fn(z.string(), (id) =>
    useTransaction(async (tx) => {
      const user = await tx
        .select({
          stripeCustomerID: userTable.stripeCustomerID,
          email: userTable.email,
          name: userTable.name,
        })
        .from(userTable)
        .where(eq(userTable.id, id))
        .then((rows) => rows.at(0));
      if (!user) throw new Error("User not found");
      const stripeCustomerId = user.stripeCustomerID;
      if (!stripeCustomerId) throw new Error("Stripe customer ID not found");
      await stripe.customers.update(stripeCustomerId, {
        email: user.email || undefined,
        name: user.name || undefined,
        metadata: {
          userID: id,
        },
      });
    }),
  );
}
