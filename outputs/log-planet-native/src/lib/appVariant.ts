export type AppVariant = "development" | "preview" | "production";

const configuredVariant = process.env.EXPO_PUBLIC_APP_VARIANT || process.env.APP_VARIANT;

export const appVariant: AppVariant =
  configuredVariant === "preview" || configuredVariant === "production" ? configuredVariant : "development";
  export const appScheme =
  appVariant === "production" ? "logplanet" : appVariant === "preview" ? "logplanet-preview" : "logplanet-dev";
export const isDevelopmentVariant = appVariant === "development";
export const isProductionVariant = appVariant === "production";
export const canUseDevTools = !isProductionVariant;
