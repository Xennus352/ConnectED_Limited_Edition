// External imports
import React from "react";

import { MdSunny } from "react-icons/md";
import { IoIosMoon } from "react-icons/io";

// Internal imports
import { Button } from "@/components/ui/button";
import { toggleTheme } from "@/store/slices/theme";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";

type PropsI = {
  className?: string;
};

const Theme: React.FC<PropsI> = () => {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.theme.themeMode);

  const handleToggle = () => {
    // The ThemeProvider derives the `dark` class from this state.
    dispatch(toggleTheme());
  };

  return (
    <Button onClick={handleToggle} size='sm'>
      {themeMode === "dark" ? <IoIosMoon /> : <MdSunny />}
    </Button>
  );
};

export default Theme;
