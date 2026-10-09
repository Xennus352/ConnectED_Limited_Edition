import React, { useLayoutEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import gsap from "gsap";
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  GraduationCap,
  Megaphone,
  MessageSquare,
  PlusCircle,
  School,
} from "lucide-react";

import useAxiosInstance from "@/api";
import useQueryHandler from "@/hooks/useQueryHandler";
import useGsapReveal from "@/hooks/useGsapReveal";
import { useGetAllLessonsByTeacherId } from "@/services/lessons";
import { useExamService } from "@/services/exams";
import { useAssignmentService } from "@/services/assignments";
import { useUnreadMessagesCount } from "@/services/messages";
import { ITeacher } from "@/interfaces/user";
import { ILesson } from "@/interfaces/lesson";
import { IExam } from "@/interfaces/exam";
import { IAssignment } from "@/interfaces/assignment";
import { IAnnouncement } from "@/interfaces/announcement";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const WEEKDAY_INDEX: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const timeMinutes = (value: Date | string): number => {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
};

const isReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

const reducedGeneric = (fullName?: string): string =>
  fullName?.trim().split(/\s+/)[0] || "";

const greeting = (hour: number): string =>
  hour < 12
    ? "teacher_dashboard.good_morning"
    : hour < 17
      ? "teacher_dashboard.good_afternoon"
      : "teacher_dashboard.good_evening";

/** Subtle GSAP count-up used for the real-data metric numbers. */
const CountUp: React.FC<{ value: number; duration?: number }> = ({
  value,
  duration = 0.9,
}) => {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isReducedMotion()) {
      el.textContent = String(value);
      return;
    }
    const state = { n: 0 };
    const tween = gsap.to(state, {
      n: value,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        if (el) el.textContent = String(Math.round(state.n));
      },
    });
    return () => void tween.kill();
  }, [value, duration]);

  return <span ref={ref}>0</span>;
};

const lessonBadgeVariant = (status?: string) =>
  status === "completed" || status === "cancelled"
    ? "neutral"
    : status === "ongoing"
      ? "default"
      : "secondary";

const lessonStatusLabel = (status?: string): string => status || "scheduled";

const SectionScaffold: React.FC<{
  title: string;
  icon?: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
}> = ({ title, icon, actionHref, actionLabel, children }) => (
  <div className='rounded-xl border bg-card p-4 shadow-sm md:p-5'>
    <div className='mb-3 flex items-center justify-between gap-2'>
      <h3 className='flex items-center gap-2 text-sm font-semibold tracking-tight'>
        {icon}
        {title}
      </h3>
      {actionHref && actionLabel ? (
        <Link
          to={actionHref}
          className='text-xs font-medium text-primary hover:underline'
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
    {children}
  </div>
);

const TeacherDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const user = useAuthUser<ITeacher>();
  const $axios = useAxiosInstance();
  const root = useGsapReveal<HTMLDivElement>();

  const teacherId = user?._id ?? "";
  const { data: lessons, isLoading: lessonsLoading } =
    useGetAllLessonsByTeacherId(teacherId);
  const { data: exams, isLoading: examsLoading } =
    useExamService().getAllExamsUnpaginated;
  const { data: assignments, isLoading: assignmentsLoading } =
    useAssignmentService().getAllAssignmentsUnpaginated;
  const unreadCount = useUnreadMessagesCount();

  const pendingAnnouncements = useQueryHandler({
    queryKey: ["announcements", "dashboard-pending"],
    queryFn: async () => {
      const response = await $axios.get("/announcements", {
        params: { status: "pending", limit: 50 },
      });
      return response?.data?.data || [];
    },
  });

  // Asia/Yangon wall-clock parts so greeting/date/today match the school day.
  const nowParts = useMemo(() => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Yangon",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const get = (type: string) =>
      parts.find((part) => part.type === type)?.value ?? "";
    const hour = parseInt(get("hour"), 10) % 24;
    return {
      weekday: get("weekday").toUpperCase().slice(0, 2) === "SU"
        ? "SUNDAY"
        : get("weekday").toUpperCase(),
      hour,
      minute: parseInt(get("minute"), 10) || 0,
    };
  }, []);

  const todayDay = useMemo(
    () =>
      ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
        .find((day) => day.startsWith(nowParts.weekday === "SUNDAY" ? "SU" : nowParts.weekday))
        ?? "MONDAY",
    [nowParts.weekday]
  );

  const allLessons: ILesson[] = useMemo(
    () => (lessons as ILesson[] | undefined) || [],
    [lessons]
  );

  const allExams: IExam[] = useMemo(
    () => (exams as IExam[] | undefined) || [],
    [exams]
  );

  const allAssignments: IAssignment[] = useMemo(
    () => (assignments as IAssignment[] | undefined) || [],
    [assignments]
  );

  const pending: IAnnouncement[] = useMemo(
    () => (pendingAnnouncements.data as IAnnouncement[] | undefined) || [],
    [pendingAnnouncements.data]
  );

  const myPendingCount = useMemo(
    () => pending.filter((a) => a?.createdBy?._id === user?._id).length,
    [pending, user?._id]
  );

  const todaysLessons = useMemo(
    () =>
      allLessons
        .filter((lesson) => lesson.day === todayDay)
        .sort((a, b) => timeMinutes(a.startTime) - timeMinutes(b.startTime)),
    [allLessons, todayDay]
  );

  const completedToday = useMemo(
    () => todaysLessons.filter((l) => l.status === "completed").length,
    [todaysLessons]
  );

  const nextLesson = useMemo(() => {
    const now = nowParts.hour * 60 + nowParts.minute;
    const sorted = [...allLessons].sort((a, b) => {
      const ai = (WEEKDAY_INDEX[a.day] ?? 9) * 1440 + timeMinutes(a.startTime);
      const bi = (WEEKDAY_INDEX[b.day] ?? 9) * 1440 + timeMinutes(b.startTime);
      return ai - bi;
    });
    const nowIndex = (WEEKDAY_INDEX[todayDay] ?? 0) * 1440 + now;
    return (
      sorted.find(
        (l) =>
          (WEEKDAY_INDEX[l.day] ?? 0) * 1440 + timeMinutes(l.startTime) > nowIndex
      ) ?? sorted[0]
    );
  }, [allLessons, todayDay, nowParts]);

  const upcomingExams = useMemo(() => {
    const now = new Date().getTime();
    return allExams
      .filter((exam) => new Date(exam.startTime).getTime() >= now)
      .sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
      .slice(0, 3);
  }, [allExams]);

  const dueAssignments = useMemo(() => {
    const now = new Date().getTime();
    return allAssignments
      .filter((item) => new Date(item.dueDate).getTime() >= now)
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      )
      .slice(0, 3);
  }, [allAssignments]);

  const workload = useMemo(() => {
    const counts: Record<string, number> = {};
    allLessons.forEach((lesson) => {
      counts[lesson.day] = (counts[lesson.day] || 0) + 1;
    });
    return ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].map(
      (day) => ({ day, count: counts[day] || 0 })
    );
  }, [allLessons]);

  const maxWorkload = Math.max(1, ...workload.map((w) => w.count));

  const headerDate = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Yangon",
      }).format(new Date()),
    [i18n.language]
  );

  const quickActions = [
    {
      href: "/list/lessons",
      icon: CalendarDays,
      label: t("teacher_dashboard.new_lesson"),
    },
    {
      href: "/list/exams",
      icon: GraduationCap,
      label: t("teacher_dashboard.new_exam"),
    },
    {
      href: "/list/assignments",
      icon: FileText,
      label: t("teacher_dashboard.new_assignment"),
    },
    {
      href: "/list/attendances",
      icon: ClipboardCheck,
      label: t("teacher_dashboard.take_attendance"),
    },
  ];

  const metricCards = [
    {
      href: "/list/lessons",
      label: t("teacher_dashboard.classes_today"),
      value: todaysLessons.length,
      icon: CalendarDays,
      accent: "text-primary",
    },
    {
      href: "/list/lessons",
      label: t("teacher_dashboard.completed_today"),
      value: completedToday,
      icon: CheckCircle2,
      accent: "text-success",
    },
    {
      href: "/list/exams",
      label: t("teacher_dashboard.exams_coming"),
      value: allExams.filter(
        (exam) => new Date(exam.startTime).getTime() >= new Date().getTime()
      ).length,
      icon: GraduationCap,
      accent: "text-warning",
    },
    {
      href: "/list/assignments",
      label: t("teacher_dashboard.assignments_active"),
      value: allAssignments.filter(
        (item) => new Date(item.dueDate).getTime() >= new Date().getTime()
      ).length,
      icon: FileText,
      accent: "text-primary",
    },
    {
      href: "/list/messages",
      label: t("teacher_dashboard.unread_messages"),
      value: unreadCount,
      icon: MessageSquare,
      accent: "text-error",
    },
  ];

  const showMetrics = lessonsLoading || examsLoading || assignmentsLoading;

  return (
    <div ref={root} className='flex min-w-0 flex-col gap-5'>
      {/* Header ---------------------------------------------------------- */}
      <div data-gsap='fade-up' className='flex flex-wrap items-center gap-4'>
        {user?.profilePhoto ? (
          <img
            src={user.profilePhoto}
            alt={user.fullName}
            className='h-12 w-12 rounded-full border object-cover shadow-sm'
          />
        ) : (
          <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary'>
            {(user?.fullName || "T").charAt(0)}
          </div>
        )}
        <div className='min-w-0 flex-1'>
          <h1 className='text-xl font-bold tracking-tight [overflow-wrap:anywhere] md:text-2xl'>
            {t(greeting(nowParts.hour))},{" "}
            <span className='text-primary'>{reducedGeneric(user?.fullName)}</span> 👋
          </h1>
          <p className='mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground'>
            <CalendarDays className='h-4 w-4' />
            {headerDate}
          </p>
        </div>
      </div>

      {/* Quick actions --------------------------------------------------- */}
      <div data-gsap-stagger className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
        {quickActions.map((action) => (
          <Link
            key={action.href}
            to={action.href}
            className='group flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-sm font-medium shadow-sm transition-colors hover:border-primary/40 hover:bg-accent'
          >
            <PlusCircle className='h-4 w-4 shrink-0 text-primary' />
            <span className='truncate'>{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Metrics --------------------------------------------------------- */}
      <div data-gsap-stagger className='grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5'>
        {showMetrics
          ? metricCards.map((_card, index) => (
              <Skeleton key={index} className='h-[92px] rounded-xl' />
            ))
          : metricCards.map((card) => (
              <Link
                key={card.href + card.label}
                to={card.href}
                className='rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40'
              >
                <card.icon className={`h-5 w-5 ${card.accent}`} />
                <div className='mt-2 text-2xl font-bold tabular-nums'>
                  <CountUp value={card.value} />
                </div>
                <div className='mt-0.5 line-clamp-2 text-xs text-muted-foreground'>
                  {card.label}
                </div>
              </Link>
            ))}
      </div>

      <div className='grid gap-4 lg:grid-cols-[1.6fr_1fr]'>
        {/* LEFT: today + workload ---------------------------------------- */}
        <div className='flex min-w-0 flex-col gap-4'>
          <SectionScaffold
            title={t("teacher_dashboard.todays_classes")}
            icon={<CalendarDays className='h-4 w-4 text-primary' />}
            actionHref='/list/lessons'
            actionLabel={t("teacher_dashboard.view_all")}
          >
            {nextLesson && !lessonsLoading ? (
              <div className='mb-2 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm'>
                <Clock className='h-4 w-4 shrink-0 text-primary' />
                <span className='shrink-0 font-semibold text-primary'>
                  {t("teacher_dashboard.next_class")}
                </span>
                <span className='truncate text-muted-foreground'>
                  {nextLesson.name || nextLesson.subject?.name}
                  {nextLesson.class?.name ? ` · ${nextLesson.class.name}` : ""} ·{" "}
                  {t(`week_days.${nextLesson.day.toLowerCase()}`)},{" "}
                  {format(new Date(nextLesson.startTime), "hh:mm a")}
                </span>
              </div>
            ) : null}
            {lessonsLoading ? (
              <div className='flex flex-col gap-2'>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className='h-16 rounded-lg' />
                ))}
              </div>
            ) : todaysLessons.length === 0 ? (
              <div className='flex flex-col items-center gap-1 py-8 text-center'>
                <School className='h-8 w-8 text-muted-foreground/40' />
                <p className='text-sm text-muted-foreground'>
                  {t("teacher_dashboard.no_classes_today")}
                </p>
              </div>
            ) : (
              <ul className='flex flex-col gap-2'>
                {todaysLessons.slice(0, 5).map((lesson: ILesson) => (
                  <li
                    key={lesson._id}
                    className='flex items-center justify-between gap-2 rounded-lg border bg-background/50 px-3 py-2.5'
                  >
                    <div className='flex min-w-0 items-center gap-3'>
                      <div className='flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-[10px] font-semibold leading-tight text-primary'>
                        <span>{format(new Date(lesson.startTime), "hh")}</span>
                        <span>{format(new Date(lesson.startTime), "a")}</span>
                      </div>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold'>
                          {lesson.name || lesson.subject?.name}
                        </p>
                        <p className='truncate text-xs text-muted-foreground'>
                          {lesson.class?.name
                            ? `${lesson.class.name} · `
                            : ""}
                          {format(new Date(lesson.startTime), "hh:mm a")} –{" "}
                          {format(new Date(lesson.endTime), "hh:mm a")}
                        </p>
                      </div>
                    </div>
                    <Badge variant={lessonBadgeVariant(lesson.status)}>
                      {t(`lesson_form.${lessonStatusLabel(lesson.status)}`)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </SectionScaffold>

          <SectionScaffold
            title={t("teacher_dashboard.weekly_workload")}
            icon={<ClipboardCheck className='h-4 w-4 text-primary' />}
          >
            <div className='flex h-36 items-end justify-between gap-2'>
              {workload.map((item) => (
                <div
                  key={item.day}
                  className='flex h-full flex-1 flex-col items-center justify-end gap-1'
                >
                  <span className='text-xs font-semibold tabular-nums'>
                    {item.count}
                  </span>
                  <div
                    className='w-full max-w-[36px] rounded-t-md bg-primary/80 transition-all'
                    style={{
                      height: `${Math.max(4, (item.count / maxWorkload) * 100)}%`,
                    }}
                  />
                  <span className='text-[10px] uppercase text-muted-foreground'>
                    {t(`week_days.${item.day.toLowerCase()}`).slice(0, 3)}
                  </span>
                </div>
              ))}
            </div>
            {allLessons.length === 0 ? (
              <p className='mt-3 text-center text-xs text-muted-foreground'>
                {t("teacher_dashboard.no_workload")}
              </p>
            ) : null}
          </SectionScaffold>
        </div>

        {/* RIGHT: deadlines + activity ----------------------------------- */}
        <div className='flex min-w-0 flex-col gap-4'>
          <SectionScaffold
            title={t("teacher_dashboard.upcoming_exams")}
            icon={<GraduationCap className='h-4 w-4 text-warning' />}
            actionHref='/list/exams'
            actionLabel={t("teacher_dashboard.view_all")}
          >
            {examsLoading ? (
              <Skeleton className='h-40 rounded-lg' />
            ) : upcomingExams.length === 0 ? (
              <div className='flex flex-col items-center gap-1 py-8 text-center'>
                <GraduationCap className='h-8 w-8 text-muted-foreground/40' />
                <p className='text-sm text-muted-foreground'>
                  {t("teacher_dashboard.no_exams")}
                </p>
              </div>
            ) : (
              <ul className='flex flex-col gap-2'>
                {upcomingExams.map((exam) => (
                  <li
                    key={exam._id}
                    className='rounded-lg border bg-background/50 px-3 py-2'
                  >
                    <p className='truncate text-sm font-semibold'>{exam.name}</p>
                    <p className='mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground'>
                      <Clock className='h-3.5 w-3.5' />
                      {format(new Date(exam.startTime), "MMMM dd, hh:mm a")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SectionScaffold>

          <SectionScaffold
            title={t("teacher_dashboard.assignments_due")}
            icon={<FileText className='h-4 w-4 text-primary' />}
            actionHref='/list/assignments'
            actionLabel={t("teacher_dashboard.view_all")}
          >
            {assignmentsLoading ? (
              <Skeleton className='h-40 rounded-lg' />
            ) : dueAssignments.length === 0 ? (
              <div className='flex flex-col items-center gap-1 py-8 text-center'>
                <FileText className='h-8 w-8 text-muted-foreground/40' />
                <p className='text-sm text-muted-foreground'>
                  {t("teacher_dashboard.no_assignments")}
                </p>
              </div>
            ) : (
              <ul className='flex flex-col gap-2'>
                {dueAssignments.map((item) => (
                  <li
                    key={item._id}
                    className='rounded-lg border bg-background/50 px-3 py-2'
                  >
                    <p className='truncate text-sm font-semibold'>{item.name}</p>
                    <p className='mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground'>
                      <BellRing className='h-3.5 w-3.5' />
                      {format(new Date(item.dueDate), "MMMM dd, yyyy")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SectionScaffold>

          <SectionScaffold
            title={t("teacher_dashboard.pending_announcements")}
            icon={<Megaphone className='h-4 w-4 text-warning' />}
            actionHref='/list/announcements'
            actionLabel={t("teacher_dashboard.view_all")}
          >
            {pendingAnnouncements.isLoading ? (
              <Skeleton className='h-20 rounded-lg' />
            ) : myPendingCount === 0 ? (
              <div className='flex flex-col items-center gap-1 py-6 text-center'>
                <Megaphone className='h-8 w-8 text-muted-foreground/40' />
                <p className='text-sm text-muted-foreground'>
                  {t("teacher_dashboard.no_pending_announcements")}
                </p>
              </div>
            ) : (
              <ul className='flex flex-col gap-2'>
                {pending
                  .filter((a) => a?.createdBy?._id === user?._id)
                  .slice(0, 3)
                  .map((a) => (
                    <li
                      key={a._id}
                      className='flex items-center justify-between gap-2 rounded-lg border bg-background/50 px-3 py-2'
                    >
                      <span className='truncate text-sm font-medium'>{a.name}</span>
                      <Badge variant='warning'>
                        {t("data-table.status_options.pending")}
                      </Badge>
                    </li>
                  ))}
              </ul>
            )}
          </SectionScaffold>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;