export const secret = {
    FACEBOOK_APP_ID: new sst.Secret("FACEBOOK_APP_ID"),
    FACEBOOK_APP_SECRET: new sst.Secret("FACEBOOK_APP_SECRET"),
    FACEBOOK_REDIRECT_URI: new sst.Secret("FACEBOOK_REDIRECT_URI"),
};

export const allSecrets = Object.values(secret);
