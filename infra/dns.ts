export const domain =
  {
    production: "openpromo.app",
    dev: "dev.openpromo.app",
  }[$app.stage] || $app.stage + ".dev.openpromo.app";
