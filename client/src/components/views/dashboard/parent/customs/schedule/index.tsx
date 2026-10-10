import React from "react";
import { BookOpen, Clock3 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { ILesson } from "@/interfaces/lesson";
import { IStudent } from "@/interfaces/user";
import { useGetAllLessonsByClassId } from "@/services/lessons";

const dayOrder = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const timeLabel = (value: string | Date) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time TBA" : new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
};

const ChildSchedule: React.FC<{ user: IStudent }> = ({ user }) => {
  const { data, isLoading } = useGetAllLessonsByClassId(user?.class?._id);
  const lessons: ILesson[] = [...(data ?? [])].sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day) || new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (isLoading) return <div className="space-y-2 p-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>;
  if (!lessons.length) return <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No lessons are scheduled for this class.</p>;

  return (
    <div className="space-y-2">
      <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weekly class schedule</p>
      {lessons.slice(0, 3).map((lesson) => (
        <div key={lesson._id} className="flex min-w-0 items-center gap-3 rounded-xl bg-muted/50 p-3 transition hover:bg-primary/[0.06]">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpen size={18} /></div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{lesson.name}</p><p className="truncate text-xs text-muted-foreground">{lesson.subject?.name ?? lesson.teacher?.fullName ?? "Class lesson"}</p></div>
          <div className="shrink-0 text-right"><p className="text-xs font-semibold">{lesson.day.slice(0, 3)}</p><p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground"><Clock3 size={12} />{timeLabel(lesson.startTime)}</p></div>
        </div>
      ))}
      {lessons.length > 3 && <p className="px-1 pt-1 text-xs text-muted-foreground">Showing the latest 3 of {lessons.length} weekly lessons</p>}
    </div>
  );
};

export default ChildSchedule;
