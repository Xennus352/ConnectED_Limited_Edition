import React from "react";
import classNames from "classnames";
import { ChevronDown } from "lucide-react";
import { matchPath, useLocation } from "react-router-dom";

import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ISidebarItem } from "@/interfaces/sidebar";

import NavItem from "../nav-item";

interface NavGroupProps {
  group: ISidebarItem;
  /** Role-filtered children handed over by SidebarNav. */
  items: ISidebarItem[];
  unreadCount?: number;
}

const storageKeyFor = (id: string) => `sidebar:group:${id}`;

/**
 * Accordion navigation group (People, Academics, Transport, Communication).
 *
 * - Remembers its expanded/collapsed choice in localStorage.
 * - Automatically expands when one of its children matches the current
 *   route, so the active item is never hidden behind a closed group.
 * - When the whole sidebar is collapsed only the group icon is shown
 *   (with a tooltip); clicking it re-expands the sidebar.
 */
const NavGroup: React.FC<NavGroupProps> = ({
  group,
  items,
  unreadCount = 0,
}) => {
  const { state, isMobile, setOpen } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const { pathname } = useLocation();
  const contentId = React.useId();

  const Icon = group.icon;

  const [manual, setManual] = React.useState<boolean | null>(null);
  const [stored, setStored] = React.useState<boolean | null>(() => {
    try {
      const value = window.localStorage.getItem(storageKeyFor(group._id));
      return value === null ? null : value === "true";
    } catch {
      return null;
    }
  });

  const containsActiveRoute = items.some(
    (child) =>
      Boolean(child.href) &&
      matchPath(
        { path: child.href as string, end: child.href === "/" },
        pathname
      ) !== null
  );

  // Precedence: explicit toggle for this visit → active route → saved state.
  const open = manual ?? (containsActiveRoute || stored === true);

  // Forget the manual toggle on navigation so the section containing the
  // newly opened route is always expanded (spec: nested active state).
  React.useEffect(() => {
    setManual(null);
  }, [pathname]);

  const toggle = () => {
    const next = !open;
    setManual(next);
    setStored(next);
    try {
      window.localStorage.setItem(storageKeyFor(group._id), String(next));
    } catch {
      /* storage unavailable — state still lives for this session */
    }
  };

  if (!items.length) return null;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={group.label}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => (collapsed ? setOpen(true) : toggle())}
        className={classNames(
          "min-h-[38px] w-full gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-semibold text-sidebar-foreground",
          "transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          "focus-visible:ring-2 focus-visible:ring-sidebar-ring/50",
          "justify-start [&>svg]:size-[18px] [&>svg]:shrink-0",
          "group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:justify-center"
        )}
      >
        <Icon strokeWidth={1.8} />
        <span className='min-w-0 flex-1 truncate'>{group.label}</span>
        <span
          aria-hidden='true'
          className={classNames(
            "flex size-4 shrink-0 items-center justify-center text-sidebar-foreground/60 transition-transform duration-200",
            open && "rotate-180",
            collapsed && "hidden"
          )}
        >
          <ChevronDown className='size-4' strokeWidth={2} />
        </span>
      </SidebarMenuButton>

      {!collapsed && (
        <div
          id={contentId}
          className={classNames(
            "overflow-hidden transition-[max-height,opacity,visibility] duration-200 ease-out",
            open
              ? "max-h-[480px] opacity-100"
              : "invisible max-h-0 opacity-0"
          )}
        >
          <ul className='ml-3.5 flex flex-col gap-0.5 border-l border-sidebar-border py-0.5 pl-3'>
            {items.map((child) => (
              <NavItem
                key={child._id}
                item={child}
                nested
                unreadCount={unreadCount}
              />
            ))}
          </ul>
        </div>
      )}
    </SidebarMenuItem>
  );
};

export default NavGroup;
