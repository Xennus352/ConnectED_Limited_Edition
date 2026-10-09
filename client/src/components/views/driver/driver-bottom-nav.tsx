import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BusFront,
  ClipboardList,
  House,
  MapPinned,
  Menu,
} from "lucide-react";

import { useSidebar } from "@/components/ui/sidebar";

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  fab?: boolean;
}

/** One destination; active state follows the current URL. */
const NavItem: React.FC<NavItemProps> = ({ to, label, icon, fab = false }) => {
  const { pathname } = useLocation();
  const isActive = pathname === to || pathname.startsWith(to + "/");

  return (
    <Link
      to={to}
      aria-current={isActive ? "page" : undefined}
      aria-label={label}
      className='flex h-full items-center justify-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
    >
      <span
        className={`flex flex-col items-center justify-center gap-1 ${
          fab ? "-translate-y-3" : ""
        }`}
      >
        {fab ? (
          <span className='relative flex h-14 w-14 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-lg'>
            {icon}
          </span>
        ) : (
          <span
            className={`flex h-9 w-16 items-center justify-center rounded-full transition-colors ${
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
          >
            {icon}
          </span>
        )}
        <span
          className={`text-[10px] font-medium leading-none ${
            isActive && !fab ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {label}
        </span>
      </span>
    </Link>
  );
};

/**
 * Mobile-first bottom navigation for drivers: Home / prominent Map / Trips /
 * Bus / More (opens the slide-out drawer). Rendered only below `lg`. The Map
 * button floats above the bar as an elevated primary action.
 */
export const DriverBottomNav: React.FC = () => {
  const { t } = useTranslation();
  const { setOpenMobile } = useSidebar();

  return (
    <nav
      aria-label={t("driver_nav.label")}
      className='fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur lg:hidden'
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className='relative mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2'>
        <NavItem to='/driver/dashboard' label={t("driver_nav.home")} icon={<House className='h-5 w-5' />} />
        <NavItem to='/driver/trips' label={t("driver_nav.trips")} icon={<ClipboardList className='h-5 w-5' />} />
        <NavItem to='/driver/bus' label={t("driver_nav.bus")} icon={<BusFront className='h-5 w-5' />} />
        <NavItem to='/driver/map' label={t("driver_nav.map")} icon={<MapPinned className='h-6 w-6' />} fab />

        <button
          type='button'
          onClick={() => setOpenMobile(true)}
          className='flex h-full flex-col items-center justify-center gap-0.5 rounded-xl text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        >
          <Menu className='h-5 w-5' />
          <span className='text-[10px] font-medium'>{t("driver_nav.more")}</span>
        </button>
      </div>
    </nav>
  );
};

export default DriverBottomNav;