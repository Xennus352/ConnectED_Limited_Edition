import React from "react";

/**
 * Persisted driver preferences.
 *
 * Changes apply immediately (React state) and are durable across sessions
 * (localStorage). The app's theme lives in Redux (`theme-mode`) — the
 * settings page writes through `setTheme`; language switches via
 * `i18n.changeLanguage`. The prefs below are driver-specific display and
 * behaviour toggles.
 */
export interface DriverSettingsT {
  /** Play a subtle sound when a new alert arrives. */
  alertSound: boolean;
  /** Show the unread alert badge in the alert centre. */
  showUnreadBadge: boolean;
  /** Compact spacing for trip/alert cards. */
  compactCards: boolean;
  /** Keep the live map centred on my bus. */
  followMeOnMap: boolean;
  /** Reduce decorative animations (overrides effects even when the OS
   * prefers-reduced-motion is off). */
  reduceAnimations: boolean;
  /** Broadcast the browser GPS continuously from the live map. */
  autoBroadcast: boolean;
  /** Unit preference is informational; "km" is the only server unit. */
  units: "km";
}

export const DRIVER_SETTINGS_DEFAULTS: DriverSettingsT = {
  alertSound: true,
  showUnreadBadge: true,
  compactCards: false,
  followMeOnMap: true,
  reduceAnimations: false,
  autoBroadcast: false,
  units: "km",
};

const STORAGE_KEY = "connect-ed.driver.settings.v1";

const loadSettings = (): DriverSettingsT => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DRIVER_SETTINGS_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<DriverSettingsT>;
    return { ...DRIVER_SETTINGS_DEFAULTS, ...parsed };
  } catch {
    return DRIVER_SETTINGS_DEFAULTS;
  }
};

export const useDriverSettings = (): {
  settings: DriverSettingsT;
  update: (patch: Partial<DriverSettingsT>) => void;
  reset: () => void;
} => {
  const [settings, setSettings] = React.useState<DriverSettingsT>(loadSettings);

  const update = React.useCallback((patch: Partial<DriverSettingsT>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = React.useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSettings(DRIVER_SETTINGS_DEFAULTS);
  }, []);

  return { settings, update, reset };
};

export default useDriverSettings;