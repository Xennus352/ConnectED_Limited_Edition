import React from "react";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";

import { Calendar } from "./customs";
import AdminDashboard from "./admin";
import ParentDashboard from "./parent";
import TeacherDashboard from "./teacher";
import StudentDashboard from "./student";
import { TUser } from "@/interfaces/user";
import { Section } from "@/components/layout";
import { useEventsService } from "@/services/events";
import EventCards from "@/components/generic/event-cards";
import { useAnnouncementsService } from "@/services/announcements";
import AnnouncementCards from "@/components/generic/announcement-cards";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";

const HomePageComponent: React.FC = () => {
  const user = useAuthUser<TUser>();
  const { getAllEvents } = useEventsService();
  const { getAllAnnouncements } = useAnnouncementsService();
  const { preferences } = useDashboardPreferences();

  const { data: eventsData, isLoading: isEventsDataLoading } = getAllEvents;
  const { data: announcementsData, isLoading: isAnnouncementsDataLoading } =
    getAllAnnouncements;

  // The parent and student dashboards render their own full-width layout,
  // including their own calendar/events/announcements rail. Only add the
  // shared right rail for the roles whose dashboard does not. Adding it for a
  // student would duplicate the calendar, events and announcements.
  const selfContainedDashboard =
    user?.role === "parent" || user?.role === "student";

  return (
    <Section id='dashboard'>
      <div className={selfContainedDashboard ? "grid grid-cols-1 gap-4" : "grid gap-4 lg:grid-cols-[1fr_auto]"}>
        {(user?.role === "admin" ||
          user?.role === "super-admin") && <AdminDashboard />}
        {user?.role === "teacher" && <TeacherDashboard />}
        {user?.role === "student" && <StudentDashboard />}
        {user?.role === "parent" && <ParentDashboard />}

        {/* RIGHT SIDE */}
        {!selfContainedDashboard && (preferences.showCalendar || preferences.showEvents || preferences.showAnnouncements) && <div className='flex min-w-0 flex-col sm:flex-row md:flex-col gap-4 lg:max-w-[340px]'>
          {/* CALENDAR */}
          {preferences.showCalendar && <Calendar />}

          {/* Events */}
          {preferences.showEvents && <EventCards data={eventsData?.data} loading={isEventsDataLoading} />}

          {/* ANNOUNCEMENTS */}
          {preferences.showAnnouncements && <AnnouncementCards
            data={announcementsData?.data}
            loading={isAnnouncementsDataLoading}
          />}
        </div>}
      </div>
    </Section>
  );
};

export default HomePageComponent;
