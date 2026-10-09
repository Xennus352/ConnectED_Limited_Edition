import React, { lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import AuthPage from "@/pages/auth";
import RequireAuth from "./require-auth";
import PrivateRoute from "./private-route";
import DashboardLayout from "@/layouts/dashboard-layout";

// list
const AdminsPage = lazy(() => import("@/pages/list/admins"));
const AdminProfilePage = lazy(() => import("@/pages/list/admins/profile"));

const TeachersPage = lazy(() => import("@/pages/list/teachers"));
const TeacherProfilePage = lazy(() => import("@/pages/list/teachers/profile"));

const StudentsPage = lazy(() => import("@/pages/list/students"));
const StudentProfilePage = lazy(() => import("@/pages/list/students/profile"));

const ParentsPage = lazy(() => import("@/pages/list/parents"));
const ParentProfilePage = lazy(() => import("@/pages/list/parents/profile"));

const ClassesPage = lazy(() => import("@/pages/list/classes"));

const RoomsPage = lazy(() => import("@/pages/list/rooms"));

const LessonsPage = lazy(() => import("@/pages/list/lessons"));

const ExamsPage = lazy(() => import("@/pages/list/exams"));

const SubjectsPage = lazy(() => import("@/pages/list/subjects"));

const AssignmentsPage = lazy(() => import("@/pages/list/assignments"));

const ResultsPage = lazy(() => import("@/pages/list/results"));

const AttendancesPage = lazy(() => import("@/pages/list/attendances"));
const AddAttendancePage = lazy(() => import("@/pages/list/attendances/class"));

const AnnouncementsPage = lazy(() => import("@/pages/list/announcements"));
const AnnouncementDetailsPage = lazy(
  () => import("@/pages/list/announcements/details")
);

const EventsPage = lazy(() => import("@/pages/list/events"));
const EventDetailsPage = lazy(() => import("@/pages/list/events/details"));

const MessagesPage = lazy(() => import("@/pages/list/messages"))
const BannedUsersPage = lazy(() => import("@/pages/list/banned"))
const BusesPage = lazy(() => import("@/pages/list/buses"))
const BusProfilePage = lazy(() => import("@/pages/list/buses/profile"))
const TripsPage = lazy(() => import("@/pages/list/trips"))
const MaintenancePage = lazy(() => import("@/pages/list/maintenance"))
const FuelPage = lazy(() => import("@/pages/list/fuel"))
const IncidentsPage = lazy(() => import("@/pages/list/incidents"))
const ReportsPage = lazy(() => import("@/pages/transport/reports"))
const DriverBoardingPage = lazy(() => import("@/pages/driver/boarding"))
const RoutesPage = lazy(() => import("@/pages/list/routes"))
const DriversPage = lazy(() => import("@/pages/list/drivers"))
const DriverProfilePage = lazy(() => import("@/pages/list/drivers/profile"))
const FleetPage = lazy(() => import("@/pages/list/fleet"))
const DriverBusPage = lazy(() => import("@/pages/driver/bus"))
const DriverLocationPage = lazy(() => import("@/pages/driver/location"))
const DriverTripsPage = lazy(() => import("@/pages/driver/trips"))
const DriverDashboardPage = lazy(() => import("@/pages/driver/dashboard"))
const DriverMapPage = lazy(() => import("@/pages/driver/map"))
const DriverRoutePage = lazy(() => import("@/pages/driver/route"))
const DriverStopsPage = lazy(() => import("@/pages/driver/stops"))
const DriverAlertsPage = lazy(() => import("@/pages/driver/alerts"))
const DriverProfilePageView = lazy(() => import("@/pages/driver/profile"))
const ParentBusTrackingPage = lazy(() => import("@/pages/parent/bus-tracking"))

const ProfilePage = lazy(() => import("@/pages/profile"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));
const ErrorsPage = lazy(() => import("@/pages/errors"));
const LogoutPage = lazy(() => import("@/pages/logout"));
const SettingsPage = lazy(() => import("@/pages/settings"));

const AppRouter: React.FC = () => {
  const router = createBrowserRouter([
    {
      path: "/",
      element: (
        <RequireAuth fallbackPath={"/auth/sign-in"}>
          <PrivateRoute
            allowedRoles={[
              "super-admin",
              "admin",
              "teacher",
              "student",
              "parent",
              "driver",
            ]}
          >
            <DashboardLayout />
          </PrivateRoute>
        </RequireAuth>
      ),
      children: [
        {
          path: "/list/admins",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin"]}>
              <AdminsPage />
            </PrivateRoute>
          ),
          children: [
            {
              path: ":adminId",
              element: (
                <PrivateRoute allowedRoles={["admin", "super-admin"]}>
                  <AdminProfilePage />
                </PrivateRoute>
              ),
            },
          ],
        },
        {
          path: "/list/teachers",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin", "teacher"]}>
              <TeachersPage />
            </PrivateRoute>
          ),
          children: [
            {
              path: ":teacherId",
              element: (
                <PrivateRoute
                  allowedRoles={["admin", "super-admin", "teacher"]}
                >
                  <TeacherProfilePage />
                </PrivateRoute>
              ),
            },
          ],
        },
        {
          path: "/list/students",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin", "teacher"]}>
              <StudentsPage />
            </PrivateRoute>
          ),
          children: [
            {
              path: ":studentId",
              element: (
                <PrivateRoute
                  allowedRoles={["admin", "super-admin", "teacher"]}
                >
                  <StudentProfilePage />
                </PrivateRoute>
              ),
            },
          ],
        },
        {
          path: "/list/parents",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin", "teacher"]}>
              <ParentsPage />
            </PrivateRoute>
          ),
          children: [
            {
              path: ":parentId",
              element: (
                <PrivateRoute
                  allowedRoles={["admin", "super-admin", "teacher"]}
                >
                  <ParentProfilePage />
                </PrivateRoute>
              ),
            },
          ],
        },
        {
          path: "/list/subjects",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin"]}>
              <SubjectsPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/list/classes",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin", "teacher"]}>
              <ClassesPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/list/rooms",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin", "teacher"]}>
              <RoomsPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/list/lessons",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin", "teacher"]}>
              <LessonsPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/list/exams",
          element: (
            <PrivateRoute
              allowedRoles={[
                "admin",
                "super-admin",
                "teacher",
                "student",
                "parent",
              ]}
            >
              <ExamsPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/list/assignments",
          element: (
            <PrivateRoute
              allowedRoles={[
                "admin",
                "super-admin",
                "teacher",
                "student",
                "parent",
              ]}
            >
              <AssignmentsPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/list/results",
          element: (
            <PrivateRoute
              allowedRoles={[
                "admin",
                "super-admin",
                "teacher",
                "student",
                "parent",
              ]}
            >
              <ResultsPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/list/attendances",
          element: (
            <PrivateRoute
              allowedRoles={[
                "admin",
                "super-admin",
                "teacher",
                "student",
                "parent",
              ]}
            >
              <AttendancesPage />
            </PrivateRoute>
          ),
          children: [
            {
              path: "class/:classId",
              element: (
                <PrivateRoute
                  allowedRoles={[
                    "admin",
                    "super-admin",
                    "teacher",
                  ]}
                >
                  <AddAttendancePage />
                </PrivateRoute>
              ),
            },
          ]
        },
        {
          path: "/list/events",
          element: (
            <PrivateRoute
              allowedRoles={[
                "admin",
                "super-admin",
                "teacher",
                "student",
                "parent",
              ]}
            >
              <EventsPage />
            </PrivateRoute>
          ),
          children: [
            {
              path: ":eventId",
              element: (
                <PrivateRoute
                  allowedRoles={[
                    "admin",
                    "super-admin",
                    "teacher",
                    "student",
                    "parent",
                  ]}
                >
                  <EventDetailsPage />
                </PrivateRoute>
              ),
            },
          ],
        },
        {
          path: "/list/announcements",
          element: (
            <PrivateRoute
              allowedRoles={[
                "admin",
                "super-admin",
                "teacher",
                "student",
                "parent",
              ]}
            >
              <AnnouncementsPage />
            </PrivateRoute>
          ),
          children: [
            {
              path: ":announcementId",
              element: (
                <PrivateRoute
                  allowedRoles={[
                    "admin",
                    "super-admin",
                    "teacher",
                    "student",
                    "parent",
                  ]}
                >
                  <AnnouncementDetailsPage />
                </PrivateRoute>
              ),
            },
          ],
        },

        {
          path: "/list/messages",
          element: (
            <PrivateRoute
              allowedRoles={[
                "admin",
                "super-admin",
                "teacher",
                "student",
                "parent",
              ]}
            >
              <MessagesPage />
            </PrivateRoute>
          ),
        },

        {
          path: "/list/banned",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin"]}>
              <BannedUsersPage />
            </PrivateRoute>
          ),
        },

        {
          path: "/list/buses",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin"]}>
              <BusesPage />
            </PrivateRoute>
          ),
          children: [
            {
              path: ":busId",
              element: (
                <PrivateRoute allowedRoles={["admin", "super-admin"]}>
                  <BusProfilePage />
                </PrivateRoute>
              ),
            },
          ],
        },
        {
          path: "/list/trips",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin"]}>
              <TripsPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/list/maintenance",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin"]}>
              <MaintenancePage />
            </PrivateRoute>
          ),
        },
        {
          path: "/list/fuel",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin"]}>
              <FuelPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/list/incidents",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin"]}>
              <IncidentsPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/transport/reports",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin"]}>
              <ReportsPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/driver/boarding",
          element: (
            <PrivateRoute allowedRoles={["driver"]}>
              <DriverBoardingPage />
            </PrivateRoute>
          ),
        },

        {
          path: "/list/routes",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin"]}>
              <RoutesPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/list/drivers",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin"]}>
              <DriversPage />
            </PrivateRoute>
          ),
          children: [
            {
              path: ":driverId",
              element: (
                <PrivateRoute allowedRoles={["admin", "super-admin"]}>
                  <DriverProfilePage />
                </PrivateRoute>
              ),
            },
          ],
        },
        {
          path: "/list/fleet",
          element: (
            <PrivateRoute allowedRoles={["admin", "super-admin"]}>
              <FleetPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/driver/bus",
          element: (
            <PrivateRoute allowedRoles={["driver"]}>
              <DriverBusPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/driver/location",
          element: (
            <PrivateRoute allowedRoles={["driver"]}>
              <DriverLocationPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/driver/trips",
          element: (
            <PrivateRoute allowedRoles={["driver"]}>
              <DriverTripsPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/driver/dashboard",
          element: (
            <PrivateRoute allowedRoles={["driver"]}>
              <DriverDashboardPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/driver/map",
          element: (
            <PrivateRoute allowedRoles={["driver"]}>
              <DriverMapPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/driver/route",
          element: (
            <PrivateRoute allowedRoles={["driver"]}>
              <DriverRoutePage />
            </PrivateRoute>
          ),
        },
        {
          path: "/driver/stops",
          element: (
            <PrivateRoute allowedRoles={["driver"]}>
              <DriverStopsPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/driver/alerts",
          element: (
            <PrivateRoute allowedRoles={["driver"]}>
              <DriverAlertsPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/driver/profile",
          element: (
            <PrivateRoute allowedRoles={["driver"]}>
              <DriverProfilePageView />
            </PrivateRoute>
          ),
        },
        {
          path: "/parent/bus-tracking",
          element: (
            <PrivateRoute allowedRoles={["parent"]}>
              <ParentBusTrackingPage />
            </PrivateRoute>
          ),
        },


        {
          path: "/profile",
          element: (
            <PrivateRoute
              allowedRoles={[
                "admin",
                "super-admin",
                "teacher",
                "student",
                "parent",
              ]}
            >
              <ProfilePage />
            </PrivateRoute>
          ),
        },
        {
          path: "/settings",
          element: (
            <PrivateRoute
              allowedRoles={[
                "admin",
                "super-admin",
                "teacher",
                "student",
                "parent",
                "driver",
              ]}
            >
              <SettingsPage />
            </PrivateRoute>
          ),
        },
        {
          path: "/logout",
          element: (
            <PrivateRoute
              allowedRoles={[
                "super-admin",
                "admin",
                "teacher",
                "student",
                "parent",
                "driver",
              ]}
            >
              <LogoutPage />
            </PrivateRoute>
          ),
        },
      ],
    },
    {
      path: "/auth/sign-in",
      element: <AuthPage />,
    },
    {
      path: "/not-found",
      element: <NotFoundPage />,
    },
    {
      path: "/errors",
      element: <ErrorsPage />,
    },
    {
      path: "*",
      element: <NotFoundPage />, // Fallback for unmatched routes
    },
  ]);

  return <RouterProvider router={router} />;
};

export default AppRouter;
