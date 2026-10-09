import { useTranslation } from "react-i18next";
import {
  BookMarked,
  BookOpen,
  BellRing,
  BusFront,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  MapPinned,
  Megaphone,
  MessageSquare,
  Presentation,
  Route,
  School,
  Settings,
  ShieldBan,
  ShieldCheck,
  User,
  UserCheck,
  UserRound,
  Users,
  Wrench,
  Fuel,
  AlertTriangle,
  BarChart3,
  Clipboard,
} from "lucide-react";

import { ISidebarSection } from "@/interfaces/sidebar";
import { TRole } from "@/interfaces/user";

/** Every role that can sign in to the dashboard (excluding the driver — the
 * driver console is a separate, guarded section). */
const ALL_ROLES: TRole[] = [
  "super-admin",
  "admin",
  "teacher",
  "student",
  "parent",
];
const STAFF_ROLES: TRole[] = ["super-admin", "admin", "teacher"];
const ADMIN_ROLES: TRole[] = ["super-admin", "admin"];
/** Driver routes are guarded separately; the sidebar mirrors spec §20. */
const EVERY_ROLE: TRole[] = [...ALL_ROLES, "driver"];

/**
 * Mirrors the existing role filter used by the previous ListItem: an entry
 * only renders when the signed-in user's role is listed in `visible`.
 * Route guards in `router/` stay the authoritative check.
 */
export const isEntryVisible = (
  visible: TRole[],
  role: TRole | undefined
): boolean => Boolean(role && visible.includes(role));

/**
 * Data-driven navigation config. Labels come from the i18n system
 * (`app_sidebar.*` namespace) so raw translation keys are never rendered,
 * and icons are Lucide icons only.
 */
const useSidebarMenu = () => {
  const { t } = useTranslation();

  const sections: ISidebarSection[] = [
    {
      _id: "overview",
      label: t("app_sidebar.overview"),
      items: [
        {
          _id: "dashboard",
          href: "/",
          label: t("app_sidebar.dashboard"),
          icon: LayoutDashboard,
          // Drivers land on /driver/dashboard instead — no generic Overview.
          visible: ALL_ROLES,
        },
      ],
    },
    {
      _id: "people",
      label: t("app_sidebar.people"),
      items: [
        {
          _id: "people-group",
          label: t("app_sidebar.people"),
          icon: Users,
          visible: STAFF_ROLES,
          children: [
            {
              _id: "admins",
              href: "/list/admins",
              label: t("app_sidebar.admins"),
              icon: ShieldCheck,
              visible: ADMIN_ROLES,
            },
            {
              _id: "teachers",
              href: "/list/teachers",
              label: t("app_sidebar.teachers"),
              icon: Presentation,
              visible: STAFF_ROLES,
            },
            {
              _id: "students",
              href: "/list/students",
              label: t("app_sidebar.students"),
              icon: UserRound,
              visible: STAFF_ROLES,
            },
            {
              _id: "parents",
              href: "/list/parents",
              label: t("app_sidebar.parents"),
              icon: HeartHandshake,
              visible: STAFF_ROLES,
            },
            {
              _id: "drivers",
              href: "/list/drivers",
              label: t("app_sidebar.drivers"),
              icon: BusFront,
              visible: ADMIN_ROLES,
            },
          ],
        },
      ],
    },
    {
      _id: "academics",
      label: t("app_sidebar.academics"),
      items: [
        {
          _id: "academics-group",
          label: t("app_sidebar.academics"),
          icon: GraduationCap,
          visible: ALL_ROLES,
          children: [
            {
              _id: "subjects",
              href: "/list/subjects",
              label: t("app_sidebar.subjects"),
              icon: BookOpen,
              visible: ADMIN_ROLES,
            },
            {
              _id: "classes",
              href: "/list/classes",
              label: t("app_sidebar.classes"),
              icon: School,
              visible: STAFF_ROLES,
            },
            {
              _id: "rooms",
              href: "/list/rooms",
              label: t("app_sidebar.rooms"),
              icon: Presentation,
              visible: ADMIN_ROLES,
            },
            {
              _id: "lessons",
              href: "/list/lessons",
              label: t("app_sidebar.lessons"),
              icon: BookMarked,
              visible: STAFF_ROLES,
            },
            {
              _id: "exams",
              href: "/list/exams",
              label: t("app_sidebar.exams"),
              icon: ClipboardCheck,
              visible: ALL_ROLES,
            },
            {
              _id: "assignments",
              href: "/list/assignments",
              label: t("app_sidebar.assignments"),
              icon: ClipboardList,
              visible: ALL_ROLES,
            },
            {
              _id: "results",
              href: "/list/results",
              label: t("app_sidebar.results"),
              icon: ChartColumn,
              visible: ALL_ROLES,
            },
            {
              _id: "attendances",
              href: "/list/attendances",
              label: t("app_sidebar.attendance"),
              icon: UserCheck,
              visible: ALL_ROLES,
            },
            {
              _id: "events",
              href: "/list/events",
              label: t("app_sidebar.events"),
              icon: CalendarDays,
              visible: ALL_ROLES,
            },
          ],
        },
      ],
    },
    {
      _id: "transport",
      label: t("app_sidebar.transport"),
      items: [
        {
          _id: "transport-group",
          label: t("app_sidebar.transport"),
          icon: BusFront,
          visible: ["super-admin", "admin", "parent", "driver"],
          children: [
            // Admin / super-admin — fleet administration, Live Fleet first.
            {
              _id: "fleet",
              href: "/list/fleet",
              label: t("fleet.liveFleet"),
              icon: MapPinned,
              visible: ADMIN_ROLES,
              live: true,
            },
            {
              _id: "buses",
              href: "/list/buses",
              label: t("app_sidebar.buses"),
              icon: BusFront,
              visible: ADMIN_ROLES,
            },
            {
              _id: "routes",
              href: "/list/routes",
              label: t("app_sidebar.routes"),
              icon: Route,
              visible: ADMIN_ROLES,
            },
            {
              _id: "trips",
              href: "/list/trips",
              label: t("app_sidebar.trips"),
              icon: Clipboard,
              visible: ADMIN_ROLES,
            },
            {
              _id: "boarding",
              href: "/driver/boarding",
              label: t("app_sidebar.boarding"),
              icon: ClipboardCheck,
              visible: ["driver"],
            },
            {
              _id: "maintenance",
              href: "/list/maintenance",
              label: t("app_sidebar.maintenance"),
              icon: Wrench,
              visible: ADMIN_ROLES,
            },
            {
              _id: "fuel",
              href: "/list/fuel",
              label: t("app_sidebar.fuel"),
              icon: Fuel,
              visible: ADMIN_ROLES,
            },
            {
              _id: "incidents",
              href: "/list/incidents",
              label: t("app_sidebar.incidents"),
              icon: AlertTriangle,
              visible: ADMIN_ROLES,
            },
            {
              _id: "reports",
              href: "/transport/reports",
              label: t("app_sidebar.reports"),
              icon: BarChart3,
              visible: ADMIN_ROLES,
            },

            // Driver — assigned operational views only.
            {
              _id: "driver-dashboard",
              href: "/driver/dashboard",
              label: t("app_sidebar.driver_dashboard"),
              icon: LayoutDashboard,
              visible: ["driver"],
            },
            {
              _id: "driver-map",
              href: "/driver/map",
              label: t("app_sidebar.driver_map"),
              icon: MapPinned,
              visible: ["driver"],
              live: true,
            },
            {
              _id: "my-bus",
              href: "/driver/bus",
              label: t("app_sidebar.my_bus"),
              icon: BusFront,
              visible: ["driver"],
            },
            {
              _id: "my-route",
              href: "/driver/route",
              label: t("app_sidebar.driver_route"),
              icon: Route,
              visible: ["driver"],
            },
            {
              _id: "driver-stops",
              href: "/driver/stops",
              label: t("app_sidebar.driver_stops"),
              icon: MapPin,
              visible: ["driver"],
            },
            {
              _id: "my-trips",
              href: "/driver/trips",
              label: t("app_sidebar.my_trips"),
              icon: ClipboardList,
              visible: ["driver"],
            },
            {
              _id: "driver-alerts",
              href: "/driver/alerts",
              label: t("app_sidebar.driver_alerts"),
              icon: BellRing,
              visible: ["driver"],
            },
            {
              _id: "live-tracking",
              href: "/driver/location",
              label: t("app_sidebar.live_tracking"),
              icon: MapPin,
              visible: ["driver"],
            },
            {
              _id: "driver-profile",
              href: "/driver/profile",
              label: t("app_sidebar.driver_profile"),
              icon: UserRound,
              visible: ["driver"],
            },
            // Parent — child bus tracking.
            {
              _id: "bus-tracking",
              href: "/parent/bus-tracking",
              label: t("app_sidebar.bus_tracking"),
              icon: MapPinned,
              visible: ["parent"],
            },
          ],
        },
      ],
    },
    {
      _id: "communication",
      label: t("app_sidebar.communication"),
      items: [
        {
          _id: "communication-group",
          label: t("app_sidebar.communication"),
          icon: MessageSquare,
          visible: EVERY_ROLE,
          children: [
            {
              _id: "messages",
              href: "/list/messages",
              label: t("app_sidebar.messages"),
              icon: Mail,
              visible: EVERY_ROLE,
              badge: "messages",
            },
            {
              _id: "announcements",
              href: "/list/announcements",
              label: t("app_sidebar.announcements"),
              icon: Megaphone,
              visible: EVERY_ROLE,
            },
          ],
        },
      ],
    },
    {
      _id: "account",
      label: t("app_sidebar.account"),
      items: [
        {
          _id: "profile",
          href: "/profile",
          label: t("app_sidebar.profile"),
          icon: User,
          // Drivers use their own /driver/profile.
          visible: ALL_ROLES,
        },
        {
          _id: "settings",
          href: "/settings",
          label: t("app_sidebar.settings"),
          icon: Settings,
          visible: EVERY_ROLE,
        },
        {
          _id: "banned",
          href: "/list/banned",
          label: t("app_sidebar.banned"),
          icon: ShieldBan,
          visible: ADMIN_ROLES,
        },
        {
          _id: "logout",
          href: "/logout",
          label: t("app_sidebar.logout"),
          icon: LogOut,
          visible: EVERY_ROLE,
        },
      ],
    },
  ];

  return { sections };
};

export default useSidebarMenu;
