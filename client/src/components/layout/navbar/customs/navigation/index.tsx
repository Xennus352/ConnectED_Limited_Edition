import React, { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useTranslation } from "react-i18next";
import useSidebarMenu from "@/utils/sidebar";
import { ISidebarItem } from "@/interfaces/sidebar";

/** Collects every navigable destination (leaf or group child) with its
 * (already-localised) label so breadcrumb labels always match the sidebar. */
const collectHrefs = (
  items: ISidebarItem[],
  out: Map<string, string>
): void => {
  for (const item of items) {
    if (item.href) out.set(item.href, item.label);
    if (item.children) collectHrefs(item.children, out);
  }
};

const Navigation: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { sections } = useSidebarMenu();

  // Resolve the current path to sidebar entries by prefix. Unmatched segments
  // (e.g. "list", "driver" or record ids like /list/students/abc) are dropped
  // so a raw translation key can never leak into the breadcrumb.
  const crumbs = useMemo(() => {
    const byHref = new Map<string, string>();
    sections.forEach((section) => collectHrefs(section.items, byHref));

    const trail: Array<{ href: string; label: string }> = [];
    let path = "";
    for (const segment of location.pathname.split("/").filter(Boolean)) {
      path += `/${segment}`;
      const label = byHref.get(path);
      if (label) trail.push({ href: path, label });
    }
    return trail;
  }, [sections, location.pathname]);

  const home = t("app_sidebar.dashboard");

  // The driver console's own "Dashboard" already stands for home — rendering
  // the Home link too would read "Dashboard > Dashboard".
  const showHome = crumbs.length === 0 || crumbs[0].label !== home;

  if (!showHome && crumbs.length === 0) return null;

  return (
    <Breadcrumb className='hidden md:block'>
      <BreadcrumbList>
        {showHome && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to='/'>{home}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <React.Fragment key={crumb.href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default Navigation;