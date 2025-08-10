export const secret = {
  FACEBOOK_APP_ID: new sst.Secret("FACEBOOK_APP_ID"),
  FACEBOOK_APP_SECRET: new sst.Secret("FACEBOOK_APP_SECRET"),
  FACEBOOK_REDIRECT_URI: new sst.Secret("FACEBOOK_REDIRECT_URI"),
  GITHUB_OAUTH_CLIENT_ID: new sst.Secret("GITHUB_OAUTH_CLIENT_ID"),
  GITHUB_OAUTH_CLIENT_SECRET: new sst.Secret("GITHUB_OAUTH_CLIENT_SECRET"),
  STRIPE_SECRET_KEY: new sst.Secret("STRIPE_SECRET_KEY"),
  WORKOS_CLIENT_ID: new sst.Secret("WORKOS_CLIENT_ID"),
  WORKOS_API_KEY: new sst.Secret("WORKOS_API_KEY"),
  WORKOS_COOKIE_PASSWORD: new sst.Secret("WORKOS_COOKIE_PASSWORD"),
};

export const allSecrets = Object.values(secret);
