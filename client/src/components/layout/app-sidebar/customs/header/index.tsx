import React from "react";
import classNames from "classnames";
import { ChevronsLeft, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import Logo from "@/components/constants/logo";

/**
 * Brand header: compact logo, strong wordmark and the collapse control.
 * On mobile the same row hosts the drawer close button.
 * Collapsed (icon) mode keeps only the logo and the expand button.
 */
const SidebarHeaderComponent: React.FC = () => {
  const { t } = useTranslation();
  const { state, isMobile, toggleSidebar, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  return (
    <SidebarHeader className='p-2.5'>
      <div
        className={classNames(
          "flex w-full items-center justify-between",
          collapsed ? "gap-1" : "gap-2.5"
        )}
      >
        <div className='flex min-w-0 items-center gap-2.5'>
          <span
            className={classNames(
              "flex shrink-0 items-center justify-center [&>img]:object-contain",
              collapsed ? "size-6" : "size-8"
            )}
          >
            <Logo size='small' />
          </span>

          {!collapsed && (
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-semibold leading-tight tracking-tight text-sidebar-foreground'>
                ConnectED
              </p>
            </div>
          )}
        </div>

        {/* Collapse / expand (desktop + tablet) */}
        <button
          type='button'
          onClick={toggleSidebar}
          aria-label={
            collapsed
              ? t("app_sidebar.expand")
              : t("app_sidebar.collapse")
          }
          className={classNames(
            "hidden shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors duration-150",
            "hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/50 focus-visible:outline-none",
            "md:flex",
            collapsed ? "size-6" : "size-7"
          )}
        >
          <ChevronsLeft
            className={classNames(
              "size-4 transition-transform duration-200",
              collapsed && "rotate-180"
            )}
            strokeWidth={2}
          />
        </button>

        {/* Mobile drawer close */}
        <button
          type='button'
          onClick={() => setOpenMobile(false)}
          aria-label={t("app_sidebar.close_navigation")}
          className='flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/50 focus-visible:outline-none md:hidden'
        >
          <X className='size-4' strokeWidth={2} />
        </button>
      </div>
    </SidebarHeader>
  );
};

export default SidebarHeaderComponent;
