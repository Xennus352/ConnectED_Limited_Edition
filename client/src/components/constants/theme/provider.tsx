import React, { useEffect } from "react";
import { useAppSelector } from "@/hooks/useRedux";

interface PropsI {
  children: React.ReactNode;
}

/**
 * Single source of truth for the dark-mode class: the `dark` class on
 * <body> is derived from the Redux `themeMode` on mount and on every
 * toggle, so the toggle button only needs to dispatch.
 */
const ThemeProvider: React.FC<PropsI> = ({ children }) => {
  const themeMode = useAppSelector((state) => state.theme.themeMode);

  useEffect(() => {
    document.body.classList.toggle("dark", themeMode === "dark");
  }, [themeMode]);

  return <>{children}</>;
};

export default ThemeProvider;
