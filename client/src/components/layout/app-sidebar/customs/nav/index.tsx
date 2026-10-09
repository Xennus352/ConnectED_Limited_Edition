import React from "react";
import { useTranslation } from "react-i18next";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";

import { SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { useUnreadMessagesCount } from "@/services/messages";
import { ISidebarItem, ISidebarSection } from "@/interfaces/sidebar";
import { TUser, TRole } from "@/interfaces/user";
import useSidebarMenu, { isEntryVisible } from "@/utils/sidebar";

import NavItem from "../nav-item";
import NavGroup from "../nav-group";

interface SidebarNavProps {
  /** Active search query — flattens the navigation into match results. */
  query: string;
}

/**
 * Scrollable navigation region: role-filtered sections with subtle
 * uppercase headers. When a search query is present the sections are
 * flattened into a single list of matching destinations.
 */
const SidebarNav: React.FC<SidebarNavProps> = ({ query }) => {
  const { t } = useTranslation();
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const { sections } = useSidebarMenu();
  const user = useAuthUser<TUser>() as TUser | null;
  const role: TRole | undefined = user?.role;
  const unreadCount = useUnreadMessagesCount();

  const canSee = (visible: TRole[]) => isEntryVisible(visible, role);
  const normalizedQuery = query.trim().toLowerCase();
  const matches = (label: string) =>
    label.toLowerCase().includes(normalizedQuery);

  // ── Search mode ────────────────────────────────────────────────
  if (normalizedQuery) {
    const results: ISidebarItem[] = [];

    sections.forEach((section: ISidebarSection) => {
      section.items.forEach((item) => {
        if (!canSee(item.visible)) return;

        if (item.children) {
          // A matching group label surfaces all of its destinations.
          const groupMatches = matches(item.label);
          item.children.forEach((child) => {
            if (!canSee(child.visible)) return;
            if (groupMatches || matches(child.label)) results.push(child);
          });
        } else if (matches(item.label)) {
          results.push(item);
        }
      });
    });

    return (
      <SidebarContent>
        <nav
          aria-label={t("app_sidebar.search_navigation")}
          className='flex flex-col px-2 pb-4 pt-1'
        >
          {results.length ? (
            <ul className='flex flex-col gap-0.5'>
              {results.map((item) => (
                <NavItem
                  key={item._id}
                  item={item}
                  unreadCount={unreadCount}
                />
              ))}
            </ul>
          ) : (
            <p className='px-3 py-8 text-center text-xs text-sidebar-foreground/60'>
              {t("app_sidebar.no_results")}
            </p>
          )}
        </nav>
      </SidebarContent>
    );
  }

  // ── Default: sectioned navigation ──────────────────────────────
  return (
    <SidebarContent>
      <nav
        aria-label={t("app_sidebar.menu")}
        className='flex flex-col gap-4 px-2 pb-4 pt-1'
      >
        {sections.map((section) => {
          const items = section.items.filter((item) =>
            canSee(item.visible)
          );
          if (!items.length) return null;

          return (
            <section key={section._id} className='flex flex-col gap-0.5'>
              {!collapsed && (
                <h2 className='px-2.5 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60'>
                  {section.label}
                </h2>
              )}
              <ul className='flex flex-col gap-0.5'>
                {items.map((item) => {
                  if (item.children) {
                    const children = item.children.filter((child) =>
                      canSee(child.visible)
                    );
                    if (!children.length) return null;
                    return (
                      <NavGroup
                        key={item._id}
                        group={item}
                        items={children}
                        unreadCount={unreadCount}
                      />
                    );
                  }

                  return (
                    <NavItem
                      key={item._id}
                      item={item}
                      unreadCount={unreadCount}
                    />
                  );
                })}
              </ul>
            </section>
          );
        })}
      </nav>
    </SidebarContent>
  );
};

export default SidebarNav;
