import { useCallback, useState } from "react";

export interface DashboardPreferences {
  showCalendar: boolean;
  showEvents: boolean;
  showAnnouncements: boolean;
}

const STORAGE_KEY = "connect-ed.dashboard.preferences.v1";
export const DASHBOARD_PREFERENCES_DEFAULTS: DashboardPreferences = {
  showCalendar: true,
  showEvents: true,
  showAnnouncements: true,
};

const loadPreferences = (): DashboardPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored
      ? { ...DASHBOARD_PREFERENCES_DEFAULTS, ...JSON.parse(stored) }
      : DASHBOARD_PREFERENCES_DEFAULTS;
  } catch {
    return DASHBOARD_PREFERENCES_DEFAULTS;
  }
};

export const useDashboardPreferences = () => {
  const [preferences, setPreferences] = useState<DashboardPreferences>(loadPreferences);

  const update = useCallback((patch: Partial<DashboardPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPreferences(DASHBOARD_PREFERENCES_DEFAULTS);
  }, []);

  return { preferences, update, reset };
};

export default useDashboardPreferences;
