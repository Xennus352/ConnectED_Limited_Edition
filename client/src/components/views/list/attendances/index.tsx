import React from "react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/layout";
import { DataTable, useColumns } from "./customs";
import { useAttendancesService } from "@/services/attendances";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";
import { IParent, IStudent } from "@/interfaces/user";
import { IAttendance } from "@/interfaces/attendance";
import { Card } from "@/components/ui/card";
import { CalendarCheck, CircleCheck, CircleX, Clock3 } from "lucide-react";
import ParentChildFilter, { ParentInfiniteSentinel, useParentInfiniteScroll } from "@/components/views/list/parent-child-filter";


const AttendancesPageView:React.FC = () => {
    const { t } = useTranslation();
    const { columns } = useColumns();
  const { getAllAttendances } = useAttendancesService();
  const user = useAuthUser() as IParent | IStudent;
  
  const { data, isLoading, isFetching } = getAllAttendances;
  const { items, sentinelRef, hasMore, loadingMore } = useParentInfiniteScroll<IAttendance>(data, isFetching);
  const cardView = user?.role === "parent" || user?.role === "student";
  
    return <Section id='attendance-page-view' title={t('app_sidebar.attendance')}>
      {user?.role === "parent" && <ParentChildFilter />}
      {cardView ? (
        isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading attendance…</p> : items.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((attendance, index) => <Card key={attendance._id} className="parent-enter p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${index * 55}ms` }}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className={`rounded-xl p-3 ${attendance.present ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>{attendance.present ? <CircleCheck size={20} /> : <CircleX size={20} />}</span><div><h2 className="font-semibold">{user?.role === "student" ? attendance.lesson?.subject?.name ?? attendance.lesson?.name ?? "Attendance" : attendance.student?.fullName}</h2><p className="text-sm text-muted-foreground">{attendance.lesson?.name ?? attendance.class?.name ?? "School day"}</p></div></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{attendance.present ? attendance.late ? "Late" : "Present" : "Absent"}</span></div><div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><CalendarCheck size={14} />{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(attendance.date))}</span>{attendance.late && <span className="flex items-center gap-1.5"><Clock3 size={14} />{attendance.minutesLate} min late</span>}</div></Card>)}</div> : <Card className="p-8 text-center text-sm text-muted-foreground">{user?.role === "student" ? "No attendance records are available yet." : "No attendance records are available for your children."}</Card>
      ) : <DataTable data={data} columns={columns} loading={isLoading} />}
      {cardView && items.length > 0 && <ParentInfiniteSentinel sentinelRef={sentinelRef} hasMore={hasMore} loading={loadingMore} />}
    </Section>;
};

export default AttendancesPageView;
