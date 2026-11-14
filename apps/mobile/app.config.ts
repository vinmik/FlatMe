import type { ConfigContext, ExpoConfig } from "expo/config";

/** Static config lives in app.json; this layer only injects build-time secrets/keys. */
export default ({ config }: ConfigContext): ExpoConfig => {
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return {
    ...(config as ExpoConfig),
    android: {
      ...config.android,
      ...(mapsKey ? { config: { ...config.android?.config, googleMaps: { apiKey: mapsKey } } } : {}),
    },
  };
};
