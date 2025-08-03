export const secret = {
    FACEBOOK_APP_ID: new sst.Secret("FACEBOOK_APP_ID"),
    FACEBOOK_APP_SECRET: new sst.Secret("FACEBOOK_APP_SECRET"),
    FACEBOOK_REDIRECT_URI: new sst.Secret("FACEBOOK_REDIRECT_URI"),
    BETTER_AUTH_SECRET: new sst.Secret("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: new sst.Secret("BETTER_AUTH_URL"),
};

export const allSecrets = Object.values(secret);
