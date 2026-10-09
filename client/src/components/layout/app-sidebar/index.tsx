import React from "react";

import { Sidebar, SidebarRail } from "@/components/ui/sidebar";
import {
  SidebarHeaderComponent,
  SidebarSearch,
  SidebarNav,
  SidebarFooterComponent,
} from "./customs";

/**
 * ConnectED premium sidebar.
 *
 * Layout: fixed brand header → search → scrollable navigation → fixed
 * profile footer. Collapses to an icon rail (with tooltips) on desktop
 * and becomes an overlay drawer on mobile, both via the existing
 * SidebarProvider primitives.
 */
const AppSidebar: React.FC<React.ComponentProps<typeof Sidebar>> = ({
  ...props
}) => {
  const [query, setQuery] = React.useState("");

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeaderComponent />
      <SidebarSearch query={query} onQueryChange={setQuery} />
      <SidebarNav query={query} />
      <SidebarFooterComponent />
      <SidebarRail />
    </Sidebar>
  );
};

export default AppSidebar;
