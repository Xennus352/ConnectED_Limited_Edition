import React from "react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/layout";
import { DataTable, useColumns } from "./customs";
import { useAssignmentService } from "@/services/assignments";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";
import { IParent, IStudent } from "@/interfaces/user";
import { IAssignment } from "@/interfaces/assignment";
import { Card } from "@/components/ui/card";
import { BookOpen, CalendarClock } from "lucide-react";
import ParentChildFilter, { ParentInfiniteSentinel, useParentInfiniteScroll } from "@/components/views/list/parent-child-filter";

const displayDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));

const AssignmentsPageView: React.FC = () => {
  const { t } = useTranslation();
  const { columns } = useColumns();
  const { getAllAssignments } = useAssignmentService();
  const user = useAuthUser() as IParent | IStudent;

  const { data, isLoading, isFetching } = getAllAssignments;
  const { items, sentinelRef, hasMore, loadingMore } = useParentInfiniteScroll<IAssignment>(data, isFetching);
  const cardView = user?.role === "parent" || user?.role === "student";

  return (
    <Section id='ssignments-page-view' title={t("app_sidebar.assignments")}>
      {user?.role === "parent" && <ParentChildFilter />}
      {cardView ? (
        isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading assignments…</p> : items.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((assignment, index) => <Card key={assignment._id} className="parent-enter overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${index * 55}ms` }}><div className="flex items-start gap-3"><span className="rounded-xl bg-amber-500/10 p-3 text-amber-600"><BookOpen size={20} /></span><div className="min-w-0"><h2 className="font-semibold">{assignment.name}</h2><p className="mt-1 text-sm text-muted-foreground">{assignment.lesson?.subject?.name ?? assignment.lesson?.name ?? "Class assignment"} · {assignment.lesson?.class?.name ?? "Class"}</p></div></div><div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><CalendarClock size={14} />Due {displayDate(assignment.dueDate)}</span><span>{new Date(assignment.dueDate).getTime() < Date.now() ? "Overdue" : "Upcoming"}</span></div></Card>)}</div> : <Card className="p-8 text-center text-sm text-muted-foreground">{user?.role === "student" ? "No assignments are listed for your class." : "No assignments are listed for your children."}</Card>
      ) : <DataTable data={data} columns={columns} loading={isLoading} />}
      {cardView && items.length > 0 && <ParentInfiniteSentinel sentinelRef={sentinelRef} hasMore={hasMore} loading={loadingMore} />}
    </Section>
  );
};

export default AssignmentsPageView;
