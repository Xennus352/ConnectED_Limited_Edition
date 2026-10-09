import type { LucideIcon } from "lucide-react";

import { TRole } from "./user";

/**
 * One entry of the sidebar navigation.
 *
 * - Leaves always carry an `href` that points at an existing route.
 * - Groups carry `children` instead of an `href` and render as accordions.
 *
 * `visible` mirrors the route guards: an entry only renders for roles it is
 * configured for. It is a UI representation of permissions — the route
 * guards in `router/` remain authoritative.
 */
export interface ISidebarItem {
  _id: string;
  href?: string;
  label: string;
  icon: LucideIcon;
  visible: TRole[];
  /** Nested accordion children — only groups carry children. */
  children?: ISidebarItem[];
  /** Small unread badge rendered on the item (e.g. Messages). */
  badge?: "messages";
  /** Realtime indicator dot rendered on the item (e.g. Live Fleet). */
  live?: boolean;
}

/** A titled sidebar region rendered under a subtle uppercase header. */
export interface ISidebarSection {
  _id: string;
  label: string;
  items: ISidebarItem[];
}
