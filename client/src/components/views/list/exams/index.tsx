import React from "react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/layout";
import { DataTable, useColumns } from "./customs";
import { useExamService } from "@/services/exams";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";
import { IParent, IStudent } from "@/interfaces/user";
import { IExam } from "@/interfaces/exam";
import { Card } from "@/components/ui/card";
import { CalendarDays, Clock3 } from "lucide-react";
import ParentChildFilter, { ParentInfiniteSentinel, useParentInfiniteScroll } from "@/components/views/list/parent-child-filter";

const displayDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));

const ExamsPageView: React.FC = () => {
  const { t } = useTranslation();
  const { columns } = useColumns();
  const { getAllExams } = useExamService();
  const user = useAuthUser() as IParent | IStudent;

  const { data, isLoading, isFetching } = getAllExams;
  const { items, sentinelRef, hasMore, loadingMore } = useParentInfiniteScroll<IExam>(data, isFetching);
  const cardView = user?.role === "parent" || user?.role === "student";

  return (
    <Section id='exams-page-view' title={t("app_sidebar.exams")}>
      {user?.role === "parent" && <ParentChildFilter />}
      {cardView ? (
        isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading exams…</p> : items.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((exam, index) => <Card key={exam._id} className="parent-enter overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${index * 55}ms` }}><div className="flex items-start gap-3"><span className="rounded-xl bg-violet-500/10 p-3 text-violet-600"><CalendarDays size={20} /></span><div className="min-w-0"><h2 className="font-semibold">{exam.name}</h2><p className="mt-1 text-sm text-muted-foreground">{exam.lesson?.subject?.name ?? exam.lesson?.name ?? "Class exam"} · {exam.lesson?.class?.name ?? "Class"}</p></div></div><div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Clock3 size={14} />{displayDate(exam.startTime)}</span><span>Ends {displayDate(exam.endTime)}</span></div></Card>)}</div> : <Card className="p-8 text-center text-sm text-muted-foreground">{user?.role === "student" ? "No exams are scheduled for your class." : "No exams are scheduled for your children."}</Card>
      ) : <DataTable data={data} columns={columns} loading={isLoading} />}
      {cardView && items.length > 0 && <ParentInfiniteSentinel sentinelRef={sentinelRef} hasMore={hasMore} loading={loadingMore} />}
    </Section>
  );
};

export default ExamsPageView;
