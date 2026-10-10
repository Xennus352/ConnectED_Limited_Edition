import React from "react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/layout";
import { DataTable, useColumns } from "./customs";
import { useEventsService } from "@/services/events";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";
import { IParent, IStudent } from "@/interfaces/user";
import { IEvent } from "@/interfaces/event";
import { Card } from "@/components/ui/card";
import { CalendarDays, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import ParentChildFilter, { ParentInfiniteSentinel, useParentInfiniteScroll } from "@/components/views/list/parent-child-filter";

const EventsPageView:React.FC = () => {
  const { t } = useTranslation();
  const { columns } = useColumns();
  const { getAllEvents } = useEventsService();
  const user = useAuthUser() as IParent | IStudent;

  const { data, isLoading, isFetching } = getAllEvents;
  const { items, sentinelRef, hasMore, loadingMore } = useParentInfiniteScroll<IEvent>(data, isFetching);
  const cardView = user?.role === "parent" || user?.role === "student";

  return <Section id='event-page-view' title={t('app_sidebar.events')}>
    {user?.role === "parent" && <ParentChildFilter />}
    {cardView ? (
      isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading events…</p> : items.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((event, index) => <Card key={event._id} className="parent-enter p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${index * 55}ms` }}><div className="flex items-start gap-3"><span className="rounded-xl bg-sky-500/10 p-3 text-sky-600"><CalendarDays size={20} /></span><div className="min-w-0"><Link to={`/list/events/${event._id}`} className="font-semibold hover:text-primary">{event.name}</Link><p className="mt-1 text-sm text-muted-foreground">{event.class?.name ?? "School-wide event"}</p></div></div><p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{event.description}</p><div className="mt-5 flex items-center gap-2 text-xs font-medium text-primary"><Clock3 size={14} />{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(event.startDate))}</div></Card>)}</div> : <Card className="p-8 text-center text-sm text-muted-foreground">{user?.role === "student" ? "No events are shared with your class right now." : "No events are shared with your children right now."}</Card>
    ) : <DataTable data={data} columns={columns} loading={isLoading} />}
    {cardView && items.length > 0 && <ParentInfiniteSentinel sentinelRef={sentinelRef} hasMore={hasMore} loading={loadingMore} />}
  </Section>;
};

export default EventsPageView;
