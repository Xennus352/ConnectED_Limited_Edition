import React from "react";
import classNames from "classnames";
import { NavLink, matchPath, useLocation } from "react-router-dom";

import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ISidebarItem } from "@/interfaces/sidebar";

interface NavItemProps {
  item: ISidebarItem;
  /** Nested items render slightly tighter than top-level items. */
  nested?: boolean;
  /** Aggregated unread messages (only rendered when item.badge === "messages"). */
  unreadCount?: number;
}

/**
 * A single navigation link. Always a real anchor (`NavLink`), so active
 * route detection, `aria-current="page"` and keyboard navigation keep
 * coming from the router. Collapsed sidebars rely on the tooltip provided
 * by SidebarMenuButton.
 */
const NavItem: React.FC<NavItemProps> = ({
  item,
  nested = false,
  unreadCount = 0,
}) => {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const { pathname } = useLocation();

  const Icon = item.icon;
  const href = item.href as string;
  const active =
    matchPath({ path: href, end: href === "/" }, pathname) !== null;

  const showBadge = item.badge === "messages" && unreadCount > 0;
  const showLive = Boolean(item.live);
  const badgeLabel =
    unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <SidebarMenuItem>
      {/* Subtle left accent for the selected item. */}
      {active && (
        <span
          aria-hidden='true'
          className='absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary'
        />
      )}

      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.label}
        className={classNames(
          "min-h-[38px] w-full gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-sidebar-foreground",
          "transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          "focus-visible:ring-2 focus-visible:ring-sidebar-ring/50",
          "justify-start [&>svg]:size-[18px] [&>svg]:shrink-0",
          "group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:justify-center",
          nested && "min-h-[34px] font-normal",
          active &&
            // !important beats shadcn's data-[active] accent variants so the
            // selected item always reads bg-primary/10 · text-primary in the
            // user's custom color, in both themes.
            "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary data-[active=true]:!bg-primary/10 data-[active=true]:!text-primary data-[active=true]:hover:!bg-primary/10 data-[active=true]:hover:!text-primary"
        )}
      >
        <NavLink to={href} end={href === "/"}>
          <Icon strokeWidth={1.8} />
          <span className='truncate'>{item.label}</span>
          {showLive && !collapsed && (
            <span
              aria-hidden='true'
              className='ml-auto size-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500'
            />
          )}
          {showBadge && !collapsed && (
            <span className='ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-medium leading-none text-primary'>
              {badgeLabel}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>

      {/* Collapsed sidebar keeps minimal indicators (unread / live). */}
      {showBadge && collapsed && (
        <span
          aria-hidden='true'
          className='pointer-events-none absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary'
        />
      )}
      {showLive && collapsed && (
        <span
          aria-hidden='true'
          className='pointer-events-none absolute right-1.5 top-1.5 size-1.5 animate-pulse rounded-full bg-emerald-500'
        />
      )}
    </SidebarMenuItem>
  );
};

export default NavItem;
