import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Clock3, MapPin, RefreshCw, UserRound } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useStudentTimetable, STUDENT_WEEKDAYS, formatTime, minutesOf, type StudentLesson } from "@/hooks/useStudentTimetable";

const mondayOf = (date: Date) => {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(12, 0, 0, 0);
  return monday;
};
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const utcCalendarDate = (date: Date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
const displayDate = (date: Date) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(utcCalendarDate(date));
const displayWeekday = (date: Date) => `${new Intl.DateTimeFormat(undefined, { weekday: "long", timeZone: "UTC" }).format(utcCalendarDate(date))} · ${displayDate(date)}`;
const titleFor = (lesson: StudentLesson) => lesson.subject?.name || lesson.name;
const EMPTY_LESSONS: StudentLesson[] = [];

const StudentSchedule = () => {
  const { t } = useTranslation();
  const query = useStudentTimetable();
  const [params, setParams] = useSearchParams();
  const requestedDate = params.get("weekOf");
  const selectedDate = requestedDate && !Number.isNaN(new Date(`${requestedDate}T12:00:00`).getTime()) ? new Date(`${requestedDate}T12:00:00`) : new Date();
  const monday = mondayOf(selectedDate);
  const weekdays = useMemo(() => {
    const defaults = STUDENT_WEEKDAYS.slice(0, 5) as readonly string[];
    const hasWeekend = (query.data ?? []).some((lesson) => ["SATURDAY", "SUNDAY"].includes(lesson.day.toUpperCase()));
    return hasWeekend ? STUDENT_WEEKDAYS : defaults;
  }, [query.data]);
  const weekDates = weekdays.map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
  const lessons = query.data ?? EMPTY_LESSONS;
  const rows = useMemo(() => {
    const starts = new Set<number>();
    lessons.forEach((lesson) => {
      const start = minutesOf(lesson.startTime);
      if (start !== null && weekdays.includes(lesson.day.toUpperCase())) starts.add(start);
    });
    return [...starts].sort((a, b) => a - b);
  }, [lessons, weekdays]);
  const visibleRange = weekDates.length ? `${displayDate(weekDates[0])} – ${displayDate(weekDates[weekDates.length - 1])}, ${weekDates[0].getFullYear()}` : "";

  const moveWeek = (amount: number) => {
    const next = new Date(monday);
    next.setDate(next.getDate() + amount * 7);
    const updated = new URLSearchParams(params);
    updated.set("weekOf", dateKey(next));
    setParams(updated);
  };
  const chooseDate = (value: string) => {
    if (!value) return;
    const updated = new URLSearchParams(params);
    updated.set("weekOf", value);
    setParams(updated);
  };
  const bySlot = (day: string, minute: number) => lessons.filter((lesson) => lesson.day.toUpperCase() === day && minutesOf(lesson.startTime) === minute);

  return <section className="space-y-4" aria-labelledby="student-timetable-heading">
    <header className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div><h2 id="student-timetable-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">{t("student_portal.timetable_title", "My Timetable")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("student_portal.timetable_subtitle", "View your weekly class schedule and lesson hours.")}</p></div>
      <div className="flex items-center justify-between gap-2 rounded-xl border bg-background p-1.5 sm:justify-end">
        <button type="button" onClick={() => moveWeek(-1)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={t("student_portal.previous_week", "Previous week")}><ChevronLeft size={18}/></button>
        <label className="relative min-w-0 text-center"><span className="sr-only">{t("student_portal.choose_week", "Choose a date in the week")}</span><span className="block whitespace-nowrap text-sm font-medium">{visibleRange}</span><input type="date" value={dateKey(selectedDate)} onChange={(event) => chooseDate(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={t("student_portal.choose_week", "Choose a date in the week")}/></label>
        <button type="button" onClick={() => moveWeek(1)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={t("student_portal.next_week", "Next week")}><ChevronRight size={18}/></button>
      </div>
    </header>

    {query.isLoading ? <div className="h-72 animate-pulse rounded-2xl bg-muted sm:h-96" aria-label={t("common.loading", "Loading timetable")}/> : query.isError ? <Card className="flex min-h-60 flex-col items-center justify-center gap-3 p-6 text-center"><p className="text-sm text-muted-foreground">{t("common.failed_to_load", "Could not load your timetable.")}</p><button onClick={() => void query.refetch()} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm"><RefreshCw size={15}/>{t("common.retry", "Retry")}</button></Card> : rows.length === 0 ? <Card className="flex min-h-60 items-center justify-center border-dashed p-8 text-center text-sm text-muted-foreground">{t("student_dashboard.no_timetable", "No timetable has been published for your class yet.")}</Card> :
      <Card className="overflow-hidden rounded-2xl p-0 shadow-sm">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[900px] table-fixed border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur"><tr><th scope="col" className="sticky left-0 z-20 w-28 border-b border-r bg-muted/95 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("student_portal.time", "Time")}</th>{weekdays.map((day, index) => <th key={day} scope="col" className="min-w-[148px] border-b px-3 py-3 text-sm font-semibold"><span className="block">{displayWeekday(weekDates[index])}</span></th>)}</tr></thead>
            <tbody>{rows.map((minute) => <tr key={minute} className="align-top even:bg-muted/20"><th scope="row" className="sticky left-0 z-[1] border-r border-b bg-card px-4 py-4 text-sm font-medium tabular-nums text-muted-foreground">{formatTime(minute)}</th>{weekdays.map((day) => {
              const slotLessons = bySlot(day, minute);
              return <td key={`${day}-${minute}`} className="h-28 border-b border-r p-2 last:border-r-0">{slotLessons.length ? <div className="space-y-2">{slotLessons.map((lesson, index) => {
                const start = minutesOf(lesson.startTime);
                const end = minutesOf(lesson.endTime);
                const cancelled = ["CANCELLED", "CANCELED"].includes(String(lesson.status).toUpperCase());
                return <article key={lesson._id ?? lesson.id ?? `${lesson.name}-${index}`} className={`h-full min-h-24 rounded-xl border-l-4 p-3 shadow-sm transition-shadow hover:shadow-md ${cancelled ? "border-l-muted-foreground bg-muted/50 opacity-70" : "border-l-primary bg-primary/[0.06] dark:bg-primary/[0.12]"}`}>
                  <h3 className={`line-clamp-2 text-sm font-semibold leading-5 ${cancelled ? "line-through" : ""}`}>{titleFor(lesson)}</h3>
                  <p className="mt-1 text-xs font-medium tabular-nums text-muted-foreground">{start !== null && end !== null ? `${formatTime(start)} – ${formatTime(end)}` : ""}</p>
                  {lesson.class?.name && <p className="mt-1 text-xs text-muted-foreground">{lesson.class.name}</p>}
                  {(lesson.room?.name || lesson.teacher?.fullName) && <div className="mt-2 space-y-1 text-xs text-muted-foreground">{lesson.room?.name && <p className="flex items-center gap-1.5"><MapPin size={12}/><span className="truncate">{lesson.room.name}</span></p>}{lesson.teacher?.fullName && <p className="flex items-center gap-1.5"><UserRound size={12}/><span className="truncate">{lesson.teacher.fullName}</span></p>}</div>}
                  {cancelled && <span className="mt-2 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">{t("student_portal.cancelled", "Cancelled")}</span>}
                </article>;
              })}</div> : <span className="sr-only">{t("student_portal.no_lesson", "No lesson scheduled")}</span>}</td>;
            })}</tr>)}</tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 border-t px-4 py-3 text-xs text-muted-foreground"><Clock3 size={14}/>{t("student_portal.timetable_note", "Lesson times are shown in your local school time.")}</div>
      </Card>}
  </section>;
};

export default StudentSchedule;
