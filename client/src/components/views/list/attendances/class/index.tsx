import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Search,
  UserX,
} from "lucide-react";

import useAxiosInstance from "@/api";
import useQueryHandler from "@/hooks/useQueryHandler";
import { useClassService } from "@/services/classes";
import { useGetAllLessonsByClassId } from "@/services/lessons";
import { IStudent } from "@/interfaces/user";
import { ILesson } from "@/interfaces/lesson";
import { IAttendance } from "@/interfaces/attendance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Section } from "@/components/layout";
import { cn } from "@/lib/utils";

type MarkState = "present" | "late" | "absent";
type MarkEntry = { state: MarkState; minutesLate: number };

const DEFAULT_ENTRY: MarkEntry = { state: "absent", minutesLate: 0 };

/** YYYY-MM-DD for "today" in the school timezone (Asia/Yangon). */
const todayInYangon = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yangon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const ClassAttendancePageView: React.FC = () => {
  const { t } = useTranslation();
  const param = useParams();
  const $axios = useAxiosInstance();
  const { getClassById } = useClassService();

  const classId = String(param?.classId || "");

  const [date, setDate] = useState(todayInYangon);
  const [lessonId, setLessonId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [marks, setMarks] = useState<Record<string, MarkEntry>>({});
  const [baseline, setBaseline] = useState<Record<string, MarkEntry>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "success" | "error" | "partial";
    text: string;
  } | null>(null);

  const { data: classInfo, isLoading: classLoading } = getClassById;
  const { data: lessonsData } = useGetAllLessonsByClassId(classId);
  const classLessons: ILesson[] = useMemo(
    () => lessonsData || [],
    [lessonsData]
  );

  // Roster (teacher-scoped server-side, so /students?class= only returns
  // students from classes the teacher may teach).
  const rosterQuery = useQueryHandler({
    queryKey: ["students", "class-roster", classId],
    queryFn: async (): Promise<IStudent[]> => {
      if (!classId) return [];
      const response = await $axios.get("/students", {
        params: { class: classId, limit: 500 },
      });
      return response?.data?.data || [];
    },
  });
  const roster: IStudent[] = useMemo(
    () => rosterQuery.data || [],
    [rosterQuery.data]
  );
  const rosterLoading = rosterQuery.isLoading;

  // Records already saved for this class/day (lesson-scoped when one is picked).
  const existingQuery = useQueryHandler({
    queryKey: ["attendances", "class-roster-records", classId, date, lessonId],
    queryFn: async (): Promise<IAttendance[]> => {
      if (!classId) return [];
      const params: Record<string, string> = { class: classId, limit: "500", date };
      if (lessonId !== "all") params.lesson = lessonId;
      const response = await $axios.get("/attendances", { params });
      return response?.data?.data || [];
    },
  });
  const existing: IAttendance[] = useMemo(
    () => existingQuery.data || [],
    [existingQuery.data]
  );

  // Rebuild the marks the first time a (class, date, lesson) set resolves.
  const appliedKey = useRef<string>("");
  useEffect(() => {
    if (!roster.length) return;
    const key = `${classId}|${date}|${lessonId}|${existing.length}`;
    if (appliedKey.current === key) return;
    appliedKey.current = key;

    const next: Record<string, MarkEntry> = {};
    for (const student of roster) {
      next[student._id] = { ...DEFAULT_ENTRY };
    }

    for (const record of existing) {
      const studentId =
        String(record.studentId || "") || record.student?._id || "";
      if (!studentId || !next[studentId]) continue;
      next[studentId] = record.present
        ? {
            state: record.late ? "late" : "present",
            minutesLate: Number(record.minutesLate) || 0,
          }
        : { ...DEFAULT_ENTRY };
    }

    setBaseline(next);
    setMarks(next);
    setNotice(null);
    // The user changed the date/lesson — a previous "saved" notice is stale.
  }, [roster, existing, classId, date, lessonId]);

  const isDirty = useMemo(() => {
    const ids = new Set([
      ...Object.keys(marks),
      ...Object.keys(baseline),
    ]);
    for (const id of ids) {
      const a = baseline[id] || DEFAULT_ENTRY;
      const b = marks[id] || DEFAULT_ENTRY;
      if (a.state !== b.state) return true;
      if (a.minutesLate !== b.minutesLate) return true;
    }
    return false;
  }, [marks, baseline]);

  const summary = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    Object.values(marks).forEach((entry) => {
      if (entry.state === "present") present += 1;
      else if (entry.state === "late") late += 1;
      else absent += 1;
    });
    return { present, late, absent };
  }, [marks]);

  const filteredRoster = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return roster;
    return roster.filter((student) =>
      student.fullName.toLowerCase().includes(term)
    );
  }, [roster, search]);

  const setStudentState = (studentId: string, state: MarkState) =>
    setMarks((prev) => {
      const current = prev[studentId] || DEFAULT_ENTRY;
      return {
        ...prev,
        [studentId]: { state, minutesLate: current.minutesLate },
      };
    });

  const setStudentMinutes = (studentId: string, minutesLate: number) =>
    setMarks((prev) => {
      const current = prev[studentId] || DEFAULT_ENTRY;
      return {
        ...prev,
        [studentId]: {
          state: current.state,
          minutesLate: Math.max(0, Math.min(180, minutesLate)),
        },
      };
    });

  const applyToAll = (state: MarkState) =>
    setMarks((prev) => {
      const next = { ...prev };
      for (const student of roster) {
        next[student._id] = {
          state,
          minutesLate: state === "late" ? 10 : 0,
        };
      }
      return next;
    });

  const discard = () => {
    setMarks({ ...baseline });
    setNotice(null);
  };

  const save = async () => {
    if (!roster.length || saving) return;
    setSaving(true);
    setNotice(null);

    const entries = roster.map((student) => {
      const entry = marks[student._id] || DEFAULT_ENTRY;
      return {
        studentId: student._id,
        present: entry.state === "present" || entry.state === "late",
        late: entry.state === "late",
        minutesLate: entry.state === "late" ? entry.minutesLate : 0,
      };
    });

    try {
      const response = await $axios.post("/attendances/bulk", {
        classId,
        date,
        lessonId: lessonId === "all" ? undefined : lessonId,
        entries,
      });
      const skipped: string[] = response?.data?.data?.skipped || [];
      if (skipped.length > 0) {
        setNotice({
          kind: "partial",
          text: t("attendance_class.partial_saved", {
            applied: (response?.data?.data?.applied || []).length,
            skipped: skipped.length,
          }),
        });
        setBaseline({ ...marks });
      } else {
        setNotice({
          kind: "success",
          text: t("attendance_class.saved_successfully"),
        });
        setBaseline({ ...marks });
      }
    } catch (error: any) {
      setNotice({
        kind: "error",
        text:
          error?.response?.data?.message ||
          t("attendance_class.save_failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  const headingTitle = classLoading
    ? t("attendance_class.page_title")
    : `${t("attendance_class.page_title")} — ${
        classInfo?.name || t("attendance_class.unknown_class")
      }`;

  const showRosterSkeleton = rosterLoading && roster.length === 0;

  return (
    <Section id='class-attendance-page-view' title={headingTitle}>
      <div className='flex flex-col gap-4'>
        {/* Controls -------------------------------------------------------- */}
        <div className='rounded-xl border bg-card p-4 shadow-sm'>
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='flex flex-wrap items-center gap-2'>
              {/* Date */}
              <div className='flex items-center gap-1.5'>
                <CalendarDays className='h-4 w-4 text-muted-foreground' />
                <Input
                  type='date'
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className='h-9 w-[150px]'
                  aria-label={t("attendance_class.date")}
                />
              </div>

              {/* Lesson */}
              <Select
                value={lessonId}
                onValueChange={(value) => setLessonId(value)}
              >
                <SelectTrigger className='h-9 w-[210px]'>
                  <SelectValue
                    placeholder={t("attendance_class.lesson")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>
                    {t("attendance_class.all_lessons")}
                  </SelectItem>
                  {(classLessons || []).map((lesson) => (
                    <SelectItem key={lesson._id} value={lesson._id}>
                      {lesson.name || lesson.subject?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Search */}
              <div className='relative'>
                <Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("attendance_class.search_student")}
                  className='h-9 w-full pl-8 sm:w-[220px]'
                />
              </div>
            </div>

            {/* Mark-all quick actions */}
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => applyToAll("present")}
                disabled={!roster.length}
              >
                <CheckCircle2 className='mr-1.5 h-4 w-4 text-success' />
                {t("attendance_class.mark_all_present")}
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => applyToAll("late")}
                disabled={!roster.length}
              >
                {t("attendance_class.mark_all_late")}
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => applyToAll("absent")}
                disabled={!roster.length}
              >
                <UserX className='mr-1.5 h-4 w-4 text-error' />
                {t("attendance_class.mark_all_absent")}
              </Button>
            </div>
          </div>

          {/* Summary + legend */}
          <div className='mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground'>
            <span className='flex items-center gap-1.5'>
              <span className='h-2.5 w-2.5 rounded-full bg-success' />
              {summary.present} {t("attendance_class.present").toLowerCase()}
            </span>
            <span className='flex items-center gap-1.5'>
              <span className='h-2.5 w-2.5 rounded-full bg-warning' />
              {summary.late} {t("attendance_class.late").toLowerCase()}
            </span>
            <span className='flex items-center gap-1.5'>
              <span className='h-2.5 w-2.5 rounded-full bg-error' />
              {summary.absent} {t("attendance_class.absent").toLowerCase()}
            </span>
            <span className='ml-auto'>
              {format(new Date(`${date}T00:00:00`), "EEEE, MMMM d, yyyy")}
            </span>
          </div>
        </div>

        {/* Notice ----------------------------------------------------------- */}
        {notice ? (
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
              notice.kind === "success" &&
                "border-success/30 bg-success/10 text-success",
              notice.kind === "partial" &&
                "border-warning/30 bg-warning/10 text-warning",
              notice.kind === "error" &&
                "border-error/30 bg-error/10 text-error"
            )}
            role='status'
          >
            {notice.kind === "success" ? (
              <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0' />
            ) : (
              <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' />
            )}
            {notice.text}
          </div>
        ) : null}

        {/* Roster ------------------------------------------------------------ */}
        <div className='overflow-hidden rounded-xl border bg-card shadow-sm'>
          <div className='flex items-center justify-between border-b bg-muted/30 px-4 py-2.5'>
            <div className='flex items-center gap-2 text-sm font-semibold'>
              <ClipboardCheck className='h-4 w-4 text-primary' />
              {t("attendance_class.roster_title")}
              <Badge variant='secondary'>{roster.length}</Badge>
            </div>
            <p className='hidden text-xs text-muted-foreground sm:block'>
              {t("attendance_class.legend")}
            </p>
          </div>

          {showRosterSkeleton ? (
            <div className='flex flex-col divide-y divide-border'>
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className='flex items-center gap-3 px-4 py-3'
                >
                  <Skeleton className='h-9 w-9 rounded-full' />
                  <div className='flex-1 space-y-1.5'>
                    <Skeleton className='h-3 w-32' />
                    <Skeleton className='h-2.5 w-20' />
                  </div>
                  <Skeleton className='h-8 w-40 rounded-md' />
                </div>
              ))}
            </div>
          ) : roster.length === 0 ? (
            <div
              className={cn(
                "flex flex-col items-center gap-2 py-14 text-center",
                rosterQuery.isError && "text-error"
              )}
            >
              <UserX className='h-10 w-10 text-muted-foreground/40' />
              <p className='text-sm font-medium text-muted-foreground'>
                {rosterQuery.isError
                  ? t("attendance_class.load_failed")
                  : t("attendance_class.no_students")}
              </p>
              {rosterQuery.isError ? (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => rosterQuery.refetch()}
                >
                  {t("attendance_class.retry")}
                </Button>
              ) : null}
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className='flex flex-col items-center gap-2 py-14 text-center'>
              <Search className='h-10 w-10 text-muted-foreground/40' />
              <p className='text-sm text-muted-foreground'>
                {t("attendance_class.no_matches")}
              </p>
            </div>
          ) : (
            <ul className='flex flex-col divide-y divide-border'>
              {filteredRoster.map((student) => {
                const entry = marks[student._id] || DEFAULT_ENTRY;
                const studentName = student.fullName || student.username;
                return (
                  <li
                    key={student._id}
                    className='flex flex-wrap items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30'
                  >
                    {student.profilePhoto ? (
                      <img
                        src={student.profilePhoto}
                        alt={studentName}
                        className='h-9 w-9 shrink-0 rounded-full border object-cover'
                      />
                    ) : (
                      <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary'>
                        {studentName.charAt(0)}
                      </div>
                    )}
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-medium'>
                        {studentName}
                      </p>
                      <p className='truncate text-xs text-muted-foreground'>
                        {student.gender
                          ? t(
                              `attendance_class.gender_${student.gender}`
                            ).concat(" · ")
                          : ""}
                        {student.username}
                      </p>
                    </div>

                    <div className='flex items-center gap-2'>
                      {/* State picker */}
                      <div className='flex rounded-lg border bg-muted/50 p-0.5'>
                        {(["present", "late", "absent"] as MarkState[]).map(
                          (state) => (
                            <button
                              key={state}
                              type='button'
                              onClick={() =>
                                setStudentState(student._id, state)
                              }
                              className={cn(
                                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                                entry.state === state
                                  ? state === "present"
                                    ? "bg-success text-success-foreground"
                                    : state === "late"
                                      ? "bg-warning text-warning-foreground"
                                      : "bg-error text-error-foreground"
                                  : "text-muted-foreground hover:bg-background"
                              )}
                            >
                              {t(`attendance_class.${state}`)}
                            </button>
                          )
                        )}
                      </div>

                      {/* Late minutes */}
                      {entry.state === "late" ? (
                        <Input
                          type='number'
                          min={1}
                          max={180}
                          value={entry.minutesLate}
                          onChange={(event) =>
                            setStudentMinutes(
                              student._id,
                              Number(event.target.value)
                            )
                          }
                          className='h-8 w-[70px]'
                          aria-label={t("attendance_class.minutes_late")}
                          title={t("attendance_class.minutes_late")}
                        />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Sticky save bar ---------------------------------------------------- */}
        <div className='sticky bottom-2 z-10 flex items-center justify-between gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur'>
          <p className='flex items-center gap-2 text-sm'>
            {isDirty ? (
              <>
                <AlertCircle className='h-4 w-4 text-warning' />
                <span className='text-warning'>
                  {t("attendance_class.unsaved_changes")}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className='h-4 w-4 text-success' />
                <span className='text-muted-foreground'>
                  {t("attendance_class.no_changes_yet")}
                </span>
              </>
            )}
          </p>
          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={discard}
              disabled={!isDirty || saving}
            >
              {t("attendance_class.discard")}
            </Button>
            <Button size='sm' onClick={save} disabled={!isDirty || saving}>
              {saving ? (
                <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
              ) : (
                <ClipboardCheck className='mr-1.5 h-4 w-4' />
              )}
              {saving
                ? t("attendance_class.saving")
                : t("attendance_class.save_changes")}
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
};

export default ClassAttendancePageView;