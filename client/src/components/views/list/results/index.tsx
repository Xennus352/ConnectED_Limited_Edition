import React from "react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/layout";
import { DataTable, useColumns } from "./customs";
import { useResultService } from "@/services/results";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";
import { IParent, IStudent } from "@/interfaces/user";
import { IResult } from "@/interfaces/result";
import { Card } from "@/components/ui/card";
import { Award, BookOpenCheck } from "lucide-react";
import ParentChildFilter, { ParentInfiniteSentinel, useParentInfiniteScroll } from "@/components/views/list/parent-child-filter";

const ResultsPageView: React.FC = () => {
  const { t } = useTranslation();
  const { columns } = useColumns();
  const { getAllResults } = useResultService();
  const user = useAuthUser() as IParent | IStudent;

  const { data, isLoading, isFetching } = getAllResults;
  const { items, sentinelRef, hasMore, loadingMore } = useParentInfiniteScroll<IResult>(data, isFetching);
  const cardView = user?.role === "parent" || user?.role === "student";

  return (
    <Section id='results-page-view' title={t("app_sidebar.results")}>
      {user?.role === "parent" && <ParentChildFilter />}
      {cardView ? (
        isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading progress…</p> : items.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((result, index) => <Card key={result._id} className="parent-enter overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${index * 55}ms` }}><div className="flex items-start gap-3"><span className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600"><Award size={20} /></span><div className="min-w-0 flex-1"><h2 className="font-semibold">{user?.role === "student" ? "My result" : result.student?.fullName}</h2><p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><BookOpenCheck size={14} />{result.exam?.name ?? result.assignment?.name ?? "Learning result"}</p></div></div><div className="mt-5 rounded-xl bg-muted/60 px-4 py-3"><p className="text-xs text-muted-foreground">Score</p><p className="text-xl font-bold">{result.score}</p></div>{result.description && <p className="mt-3 text-sm text-muted-foreground">{result.description}</p>}</Card>)}</div> : <Card className="p-8 text-center text-sm text-muted-foreground">{user?.role === "student" ? "No results are available yet." : "No results have been shared for your children yet."}</Card>
      ) : <DataTable data={data} columns={columns} loading={isLoading} />}
      {cardView && items.length > 0 && <ParentInfiniteSentinel sentinelRef={sentinelRef} hasMore={hasMore} loading={loadingMore} />}
    </Section>
  );
};

export default ResultsPageView;
