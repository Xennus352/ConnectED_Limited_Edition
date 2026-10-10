import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Award, BookOpen, CalendarDays, Clock3, MapPin, Megaphone, Pause, Play, UserRound } from "lucide-react";
import { useState } from "react";

import useAxiosInstance from "@/api";
import { Card, CardTitle } from "@/components/ui/card";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";
import type { TUser } from "@/interfaces/user";
import { dayInYangon, formatTime, minutesOf, useStudentTimetable, type StudentLesson } from "@/hooks/useStudentTimetable";
import StudentCalendar from "./customs/calendar";

type AcademicItem = { _id: string; name: string; startTime?: string; endTime?: string; dueDate?: string; lesson?: { name?: string; subject?: { name?: string }; class?: { name?: string } } };
type Announcement = { _id: string; name: string; description?: string; date?: string };
type SchoolEvent = { _id: string; name: string; description?: string; startDate: string; endDate?: string; class?: { name?: string } };
type Summary = { todayLessons: number; upcomingExams: number; upcomingAssignments: number; attendanceRate: number | null; attendanceRecords: number };
const recordsFrom = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) return (data as { data: T[] }).data;
  return [];
};
const ymdYangon = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Yangon", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const StudentDashboard = () => {
  const { t } = useTranslation();
  const axios = useAxiosInstance();
  const user = useAuthUser<TUser>() as TUser | null;
  const [tickerPaused, setTickerPaused] = useState(false);
  const timetable = useStudentTimetable();
  const summary = useQuery({ queryKey: ["student", "dashboard-summary"], queryFn: async () => (await axios.get("/student/dashboard-summary")).data.data as Summary, staleTime: 60_000, retry: 1 });
  const day = dayInYangon();
  const todayLessons = (timetable.data ?? []).filter((lesson) => lesson.day.toUpperCase() === day && !["CANCELLED", "CANCELED"].includes(String(lesson.status).toUpperCase())).sort((a, b) => (minutesOf(a.startTime) ?? 0) - (minutesOf(b.startTime) ?? 0));
  const todayDate = ymdYangon();
  const exams = useQuery({ queryKey: ["student", "dashboard-exams", todayDate], queryFn: async () => recordsFrom<AcademicItem>((await axios.get("/exams", { params: { page: 1, limit: 3, startsAfter: todayDate } })).data?.data), staleTime: 60_000, retry: 1 });
  const assignments = useQuery({ queryKey: ["student", "dashboard-assignments", todayDate], queryFn: async () => recordsFrom<AcademicItem>((await axios.get("/assignments", { params: { page: 1, limit: 3, dueAfter: todayDate } })).data?.data), staleTime: 60_000, retry: 1 });
  const announcements = useQuery({ queryKey: ["student", "dashboard-announcements"], queryFn: async () => recordsFrom<Announcement>((await axios.get("/announcements", { params: { page: 1, limit: 3 } })).data?.data), staleTime: 60_000, retry: 1 });
  const events = useQuery({ queryKey: ["student", "dashboard-events"], queryFn: async () => recordsFrom<SchoolEvent>((await axios.get("/events", { params: { page: 1, limit: 20 } })).data?.data).filter((event) => new Date(event.startDate).getTime() >= Date.now()).slice(0, 3), staleTime: 60_000, retry: 1 });
  const dateLabel = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "Asia/Yangon" }).format(new Date());
  const stats = [
    { title: t("student_portal.today_classes", "Today's classes"), value: summary.data?.todayLessons, icon: CalendarDays, color: "text-sky-600 bg-sky-500/10" },
    { title: t("student_portal.upcoming_exams", "Upcoming exams"), value: summary.data?.upcomingExams, icon: Award, color: "text-violet-600 bg-violet-500/10" },
    { title: t("student_portal.upcoming_homework", "Homework due"), value: summary.data?.upcomingAssignments, icon: BookOpen, color: "text-amber-600 bg-amber-500/10" },
    { title: t("student_portal.attendance", "Attendance"), value: summary.data?.attendanceRate == null ? "—" : `${summary.data.attendanceRate}%`, icon: Clock3, color: "text-emerald-600 bg-emerald-500/10" },
  ];

  const dataState = (loading: boolean, error: boolean, empty: boolean, emptyText: string) => loading ? <div className="h-16 animate-pulse rounded-lg bg-muted"/> : error ? <p className="py-4 text-sm text-muted-foreground">{t("common.failed_to_load", "Could not load this information.")}</p> : empty ? <p className="py-4 text-sm text-muted-foreground">{emptyText}</p> : null;
  const academicCard = (title: string, link: string, items: AcademicItem[], loading: boolean, error: boolean, type: "exam" | "assignment") => <Card className="min-w-0 p-4 sm:p-5" key={type}>
    <div className="mb-3 flex items-center justify-between gap-2"><CardTitle className="text-base">{title}</CardTitle><Link to={link} className="shrink-0 text-xs font-medium text-primary hover:underline">{t("common.view_all", "View all")}</Link></div>
    {dataState(loading, error, items.length === 0, type === "exam" ? t("student_portal.no_upcoming_exams", "No upcoming exams.") : t("student_portal.no_upcoming_homework", "No upcoming homework.") ) ?? <ul className="divide-y">{items.map((item) => {
      const date = type === "exam" ? item.startTime : item.dueDate;
      return <li key={item._id} className="py-3 first:pt-0 last:pb-0"><Link to={link} className="font-medium hover:text-primary">{item.name}</Link><p className="mt-1 text-xs text-muted-foreground">{item.lesson?.subject?.name ?? item.lesson?.name ?? ""}{item.lesson?.class?.name ? ` · ${item.lesson.class.name}` : ""}</p>{date && <time className="mt-1 block text-xs text-muted-foreground">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(date))}</time>}</li>;
    })}</ul>}
  </Card>;

  return <main className="space-y-5 sm:space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("student_dashboard.welcome", "Welcome back")}, {user?.fullName ?? user?.username} <span aria-hidden="true">👋</span></h1><div className="flex items-center justify-between gap-3 sm:justify-end"><p className="text-sm text-muted-foreground">{t("student_portal.date", "Date")}: {dateLabel}</p><Link to="/profile" className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><UserRound size={15}/>{t("app_sidebar.profile", "Profile")}</Link></div></header>

    <section aria-label={t("student_portal.quick_stats", "Quick statistics")} className="grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.map(({ title, value, icon: Icon, color }) => <Card key={title} className="flex min-w-0 items-center gap-3 p-4 transition-shadow hover:shadow-md sm:p-5"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${color}`}><Icon size={19}/></span><div className="min-w-0"><p className="truncate text-xs text-muted-foreground sm:text-sm">{title}</p>{summary.isLoading ? <div className="mt-1 h-6 w-10 animate-pulse rounded bg-muted"/> : summary.isError ? <p className="mt-1 text-sm text-muted-foreground">—</p> : <p className="mt-0.5 text-xl font-semibold tabular-nums">{value ?? "0"}</p>}</div></Card>)}</section>

    <div className="grid items-start gap-5 xl:grid-cols-12">
      <div className="min-w-0 space-y-5 xl:col-span-8">
        <Card className="p-4 sm:p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><CardTitle className="text-lg">{t("student_portal.todays_schedule", "Today's schedule")}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{t("student_portal.todays_schedule_subtitle", "Your lessons for today, in school time.")}</p></div><Link to="/student/timetable" className="text-sm font-medium text-primary hover:underline">{t("student_portal.full_timetable", "Full weekly timetable →")}</Link></div>
          {timetable.isLoading ? <div className="space-y-3">{[0, 1, 2].map((key) => <div key={key} className="h-14 animate-pulse rounded-lg bg-muted"/>)}</div> : timetable.isError ? <p className="py-4 text-sm text-muted-foreground">{t("common.failed_to_load", "Could not load this information.")}</p> : todayLessons.length ? <ol className="divide-y">{todayLessons.map((lesson) => <TodayLesson key={lesson._id ?? lesson.id} lesson={lesson}/>)}</ol> : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("student_portal.no_lessons_today", "No lessons are scheduled for today.")}</p>}
        </Card>
        <section className="grid gap-4 md:grid-cols-2" aria-label={t("student_portal.academic_overview", "Academic overview")}>
          {academicCard(t("student_portal.upcoming_exams", "Upcoming exams"), "/list/exams", exams.data ?? [], exams.isLoading, exams.isError, "exam")}
          {academicCard(t("student_portal.homework", "Assignments / homework"), "/list/assignments", assignments.data ?? [], assignments.isLoading, assignments.isError, "assignment")}
        </section>
      </div>
      <aside className="min-w-0 space-y-5 xl:col-span-4">
        <section aria-label={t("student_portal.calendar", "Calendar")}><h2 className="mb-2 px-1 text-base font-semibold">{t("student_portal.calendar", "Calendar")}</h2><StudentCalendar/></section>
        <Card className="p-4 sm:p-5"><div className="mb-3 flex items-center justify-between gap-2"><CardTitle className="text-base">{t("admin_dashboard.events", "Events")}</CardTitle><Link to="/list/events" className="text-xs font-medium text-primary hover:underline">{t("common.view_all", "View all")}</Link></div>
          {dataState(events.isLoading, events.isError, events.data?.length === 0, t("admin_dashboard.no_data_available", "No Data Available")) ?? <ul className="divide-y">{events.data?.map((event) => <li key={event._id} className="py-3 first:pt-0 last:pb-0"><Link to={`/list/events/${event._id}`} className="font-medium hover:text-primary">{event.name}</Link>{event.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>}<time className="mt-2 block text-xs text-muted-foreground">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(event.startDate))}</time></li>)}</ul>}
        </Card>
        <Card className="min-w-0 p-4 sm:p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4 text-primary"/>{t("admin_dashboard.announcements", "Announcements")}</CardTitle><div className="flex items-center gap-3"><Link to="/list/announcements" className="text-xs font-medium text-primary hover:underline">{t("common.view_all", "View all")}</Link>{announcements.data?.length ? <button type="button" aria-pressed={tickerPaused} onClick={() => setTickerPaused((paused) => !paused)} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={tickerPaused ? t("student_portal.resume_ticker", "Resume announcements") : t("student_portal.pause_ticker", "Pause announcements")}>{tickerPaused ? <Play size={14}/> : <Pause size={14}/>}<span>{tickerPaused ? t("student_portal.play", "Play") : t("student_portal.pause", "Pause")}</span></button> : null}</div></div>
          {dataState(announcements.isLoading, announcements.isError, announcements.data?.length === 0, t("admin_dashboard.no_data_available", "No announcements yet.")) ?? <div className="student-announcement-ticker overflow-hidden rounded-xl border bg-muted/20" data-paused={tickerPaused}><div className="student-announcement-track flex w-max items-center">{[0, 1].map((copy) => <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>{(announcements.data ?? []).map((item) => <article key={`${copy}-${item._id}`} className="flex min-h-[76px] w-[min(82vw,420px)] shrink-0 items-center gap-3 border-r px-4 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Megaphone size={16}/></span><div className="min-w-0 flex-1"><Link tabIndex={copy === 1 ? -1 : undefined} to={`/list/announcements/${item._id}`} className="block truncate text-sm font-semibold hover:text-primary">{item.name}</Link>{item.description && <p className="mt-1 truncate text-xs text-muted-foreground">{item.description}</p>}</div>{item.date && <time className="shrink-0 text-xs text-muted-foreground">{new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(item.date))}</time>}</article>)}</div>)}</div></div>}
        </Card>
      </aside>
    </div>
  </main>;
};

const TodayLesson = ({ lesson }: { lesson: StudentLesson }) => {
  const { t } = useTranslation();
  const start = minutesOf(lesson.startTime);
  const end = minutesOf(lesson.endTime);
  return <li className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:gap-4"><div className="w-28 shrink-0 text-sm font-semibold tabular-nums text-primary">{start === null ? "—" : formatTime(start)}{end !== null && <span className="block text-xs font-normal text-muted-foreground">{t("student_portal.to", "to")} {formatTime(end)}</span>}</div><div className="min-w-0 flex-1"><p className="font-medium">{lesson.subject?.name || lesson.name}{lesson.class?.name && <span className="font-normal text-muted-foreground"> · {lesson.class.name}</span>}</p><p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">{lesson.teacher?.fullName && <span>{lesson.teacher.fullName}</span>}{lesson.room?.name && <span className="inline-flex items-center gap-1"><MapPin size={12}/>{lesson.room.name}</span>}</p></div></li>;
};

export default StudentDashboard;
