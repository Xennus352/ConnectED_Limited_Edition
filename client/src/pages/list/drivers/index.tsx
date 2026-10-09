import React from "react";
import { Outlet, useOutlet } from "react-router-dom";
import DriversPageView from "@/components/views/list/users/drivers";

const DriversPage: React.FC = () => {
  const hasOutlet = useOutlet();

  if (hasOutlet) {
    return <Outlet />;
  }

  return <DriversPageView />;
};

export default DriversPage;