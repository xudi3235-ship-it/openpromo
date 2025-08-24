export const secret = {
  FACEBOOK_APP_ID: new sst.Secret("FACEBOOK_APP_ID"),
  FACEBOOK_APP_SECRET: new sst.Secret("FACEBOOK_APP_SECRET"),
  FACEBOOK_REDIRECT_URI: new sst.Secret("FACEBOOK_REDIRECT_URI"),
  STRIPE_SECRET_KEY: new sst.Secret("STRIPE_SECRET_KEY"),
  WORKOS_CLIENT_ID: new sst.Secret("WORKOS_CLIENT_ID"),
  WORKOS_API_KEY: new sst.Secret("WORKOS_API_KEY"),
  WORKOS_COOKIE_PASSWORD: new sst.Secret("WORKOS_COOKIE_PASSWORD"),
  NEON_API_KEY: new sst.Secret("NEON_API_KEY"),
  NEON_PROJECT_ID: new sst.Secret("NEON_PROJECT_ID"),
  LIQUID_API_URL: new sst.Secret("LIQUID_API_URL"),
};

export const allSecrets = Object.values(secret);
