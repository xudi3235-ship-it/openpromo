import { env } from "@openpromo/core/utils/env";

const BASE_URL = `https://graph.facebook.com/v23.0/${env.FACEBOOK_APP_ID}/subscriptions`;
const CALLBACK_URL = "https://dash.staging.openpromo.app/webhooks/facebook";

const getAccessToken = () =>
  `${env.FACEBOOK_APP_ID}|${env.FACEBOOK_APP_SECRET}`;

async function main() {
  const formData = new FormData();
  formData.append("object", "page");
  formData.append("callback_url", CALLBACK_URL);
  formData.append("fields", ["feed", "messages"]);
  formData.append("include_values", "true");
  formData.append("verify_token", env.FACEBOOK_WEBHOOK_VERIFY_TOKEN);
  try {
    await fetch(`${BASE_URL}?access_token=${getAccessToken()}`, {
      method: "POST",
      body: formData,
    });
    const get = await fetch(`${BASE_URL}?access_token=${getAccessToken()}`, {
      method: "GET",
    });
    console.log(JSON.stringify(await get.json(), null, 2));
  } catch (error) {
    console.error(error);
  }
}

main();
