import React from "react";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";
import { BookOpen, CalendarDays, CheckCircle2, Clock3, Sparkles, UserRound } from "lucide-react";

import Loading from "./loading";
import { IParent, IStudent } from "@/interfaces/user";
import { IExam } from "@/interfaces/exam";
import { IAssignment } from "@/interfaces/assignment";
import { IAttendance } from "@/interfaces/attendance";
import { useExamService } from "@/services/exams";
import { useAssignmentService } from "@/services/assignments";
import { useAttendancesService } from "@/services/attendances";
import { Card } from "@/components/ui/card";

const dateLabel = (value?: string | Date) => {
  if (!value) return "Date to be announced";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date to be announced" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
};

const ParentDashboard: React.FC = () => {
  const user = useAuthUser() as IParent;
  const { getAllExams } = useExamService();
  const { getAllAssignments } = useAssignmentService();
  const { getAllAttendances } = useAttendancesService();
  const children = user?.children ?? [];
  const exams: IExam[] = getAllExams.data?.data ?? [];
  const assignments: IAssignment[] = getAllAssignments.data?.data ?? [];
  const attendances: IAttendance[] = getAllAttendances.data?.data ?? [];
  const loading = getAllExams.isLoading || getAllAssignments.isLoading || getAllAttendances.isLoading;
  const childNamesInClass = (classId?: string) => children.filter((child) => child.class?._id === classId).map((child) => child.fullName).join(", ");

  if (loading) return <Loading />;

  return (
    <main className="space-y-5 pb-8">
      <section className="parent-enter relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-sky-500 p-6 text-primary-foreground shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-[-5rem] right-1/3 h-44 w-44 rounded-full bg-cyan-200/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium"><Sparkles size={15} /> Family learning hub</div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome, {user?.fullName?.split(" ")[0] ?? "Parent"}</h1>
          <p className="mt-2 text-sm text-white/85 sm:text-base">A quick view of your children’s school updates and learning progress.</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded-xl bg-white/15 px-3 py-2">{children.length} {children.length === 1 ? "child" : "children"}</span>
            <span className="rounded-xl bg-white/15 px-3 py-2">{getAllExams.data?.meta?.total ?? exams.length} exams</span>
            <span className="rounded-xl bg-white/15 px-3 py-2">{getAllAssignments.data?.meta?.total ?? assignments.length} homework</span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading title="Your children" subtitle="Children connected to your parent account" count={children.length} />
        {children.length ? <div className="grid gap-3 sm:grid-cols-2">{children.map((child: IStudent, index) => <article className="parent-enter min-w-0" key={child._id} style={{ animationDelay: `${index * 80}ms` }}><Card className="flex h-full items-center gap-3 p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10 text-primary">{child.profilePhoto ? <img src={child.profilePhoto} alt="" className="h-full w-full object-cover" /> : child.fullName?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || <UserRound size={21} />}</div><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{child.fullName} <span className="font-normal text-muted-foreground">· {child.class?.name ?? "Class not assigned"}</span></h3><p className="truncate text-xs text-muted-foreground">{child.username}{child.email ? ` · ${child.email}` : ""}</p></div><span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium capitalize text-emerald-700 dark:text-emerald-300">{child.status ?? "Enrolled"}</span></Card></article>)}</div> : <Card className="p-6 text-center text-sm text-muted-foreground">No children are linked to this account yet.</Card>}
      </section>

      <Card className="parent-enter p-4 shadow-sm sm:p-5">
        <SectionHeading title="Recent attendance" subtitle="Latest updates for your children" count={attendances.length} />
        {attendances.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{attendances.slice(0, 3).map((attendance) => <div key={attendance._id} className="flex items-center gap-3 rounded-xl border bg-background/70 p-3"><span className={`rounded-xl p-2 ${attendance.present ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}><CheckCircle2 size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{attendance.student?.fullName} <span className="font-normal text-muted-foreground">· {attendance.present ? attendance.late ? "Late" : "Present" : "Absent"}</span></p><p className="truncate text-xs text-muted-foreground">{dateLabel(attendance.date)}</p></div></div>)}</div> : <p className="mt-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No attendance records yet.</p>}
      </Card>

      <section className="space-y-3">
        <SectionHeading title="Academic deadlines & actionables" subtitle="Upcoming work for your children" count={exams.length + assignments.length} />
        <div className="grid gap-5 xl:grid-cols-2">
        <AcademicFeed title="Upcoming exams" icon={<CalendarDays size={20} />} empty="No exams are scheduled for your children right now." count={exams.length}>
          {exams.slice(0, 3).map((exam) => <article key={exam._id} className="group flex items-start gap-3 rounded-2xl border bg-background/70 p-4 transition hover:border-primary/40 hover:bg-primary/[0.03]"><span className="mt-0.5 rounded-xl bg-violet-500/10 p-2.5 text-violet-600"><Clock3 size={18} /></span><div className="min-w-0 flex-1"><h3 className="font-semibold">{exam.name}</h3><p className="mt-1 text-sm text-muted-foreground">{exam.lesson?.name ?? "Class exam"} · {exam.lesson?.class?.name ?? "Class"}</p><p className="text-xs text-muted-foreground">{childNamesInClass(exam.lesson?.class?._id) || "For your children"}</p><p className="mt-2 text-xs font-medium text-primary">{dateLabel(exam.startTime)}</p></div></article>)}
        </AcademicFeed>
        <AcademicFeed title="Assignments / homework" icon={<BookOpen size={20} />} empty="No assignments are listed for your children right now." count={assignments.length}>
          {assignments.slice(0, 3).map((assignment) => <article key={assignment._id} className="group flex items-start gap-3 rounded-2xl border bg-background/70 p-4 transition hover:border-primary/40 hover:bg-primary/[0.03]"><span className="mt-0.5 rounded-xl bg-amber-500/10 p-2.5 text-amber-600"><CheckCircle2 size={18} /></span><div className="min-w-0 flex-1"><h3 className="font-semibold">{assignment.name}</h3><p className="mt-1 text-sm text-muted-foreground">{assignment.lesson?.name ?? "Class assignment"} · {assignment.lesson?.class?.name ?? "Class"}</p><p className="text-xs text-muted-foreground">{childNamesInClass(assignment.lesson?.class?._id) || "For your children"}</p><p className="mt-2 text-xs font-medium text-primary">Due {dateLabel(assignment.dueDate)}</p></div></article>)}
        </AcademicFeed>
        </div>
      </section>

    </main>
  );
};

const SectionHeading = ({ title, subtitle, count }: { title: string; subtitle: string; count: number }) => (
  <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">{title}</h2><p className="text-xs text-muted-foreground">{subtitle}</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{count}</span></div>
);

const AcademicFeed = ({ title, icon, empty, count, children }: { title: string; icon: React.ReactNode; empty: string; count: number; children: React.ReactNode }) => (
  <Card className="parent-enter p-4 shadow-md sm:p-5">
    <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</span><div><h2 className="font-semibold">{title}</h2><p className="text-xs text-muted-foreground">For your children</p></div></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{count}</span></div>
    <div className="grid gap-3">{count ? children : <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">{empty}</div>}</div>
  </Card>
);

export default ParentDashboard;
