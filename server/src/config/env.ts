import "dotenv/config";

const read = (key: string, fallback = ""): string => {
  const value = process.env[key];
  return value === undefined || value === "" ? fallback : value;
};

export const config = {
  name: "ConnectED",
  port: Number(read("PORT", "8000")),
  databaseUrl: read("DATABASE_URL", "mongodb://127.0.0.1:27017/connected"),
  jwtSecret: read("JWT_SECRET", "connect-ed-local-dev-secret"),
  jwtExpiresIn: read("JWT_EXPIRES_IN", "7d"),
  publicUrl: read("PUBLIC_URL", ""),
  clientOrigins: read("CLIENT_ORIGINS", "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  /**
   * Freshness thresholds (seconds) for a bus' `lastLocationAt`, mirrored to
   * the client so markers never claim LIVE for data the server has not
   * actually received recently. Override with FRESH_/DELAYED_/STALE_/OFFLINE_
   * LOCATION_SECONDS.
   */
  locationFreshSeconds: Number(read("FRESH_LOCATION_SECONDS", "15")),
  locationDelayedSeconds: Number(read("DELAYED_LOCATION_SECONDS", "60")),
  locationStaleSeconds: Number(read("STALE_LOCATION_SECONDS", "300")),

  /**
   * Demo-only GPS simulator. With no phones actually driving, the live map
   * would be empty a few seconds after seeding — this moves every RUNNING
   * bus along its route and keeps connected vehicles' fixes fresh, so the
   * fleet page is populated and moving out of the box. Disable with
   * FLEET_SIMULATION_ENABLED=false.
   */
  fleetSimulationEnabled: read("FLEET_SIMULATION_ENABLED", "true") !== "false",
  fleetSimulationTickSeconds: Number(read("FLEET_SIMULATION_TICK_SECONDS", "4")),

  /**
   * OpenStreetMap-compatible raster tiles. No API key is required for OSM;
   * if a keyed provider (MapTiler, Mapbox, ...) is used, put the key in the
   * environment rather than in source.
   */
  mapTileUrl: read(
    "MAP_TILE_URL",
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
  ),
  mapTileAttribution: read(
    "MAP_TILE_ATTRIBUTION",
    "&copy; OpenStreetMap contributors"
  ),
  /** Fallback map centre (Almaty) used only when no bus has a location yet. */
  mapCenterLatitude: Number(read("MAP_CENTER_LATITUDE", "43.2410")),
  mapCenterLongitude: Number(read("MAP_CENTER_LONGITUDE", "76.8930")),
  mapDefaultZoom: Number(read("MAP_DEFAULT_ZOOM", "13")),
};

export default config;
