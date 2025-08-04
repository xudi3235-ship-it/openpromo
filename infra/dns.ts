const DOMAIN = {
  production: "openpromo.app",
  dev: "dev.openpromo.app",
};

export const domain = DOMAIN[$app.stage] || `${$app.stage}.dev.openpromo.app`;
