import React from "react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/layout";
import { DataTable, useColumns } from "./customs";
import { useAnnouncementsService } from "@/services/announcements";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";
import { IParent, IStudent } from "@/interfaces/user";
import { IAnnouncement } from "@/interfaces/announcement";
import { Card } from "@/components/ui/card";
import { Megaphone } from "lucide-react";
import { Link } from "react-router-dom";
import ParentChildFilter, { ParentInfiniteSentinel, useParentInfiniteScroll } from "@/components/views/list/parent-child-filter";

const AnnouncementsPageView:React.FC = () => {
  const { t } = useTranslation();
  const { columns } = useColumns();
  const { getAllAnnouncements } = useAnnouncementsService();
  const user = useAuthUser() as IParent | IStudent;

  const { data, isLoading, isFetching } = getAllAnnouncements;
  const { items, sentinelRef, hasMore, loadingMore } = useParentInfiniteScroll<IAnnouncement>(data, isFetching);
  const cardView = user?.role === "parent" || user?.role === "student";

  return <Section id='announcement-page-view' title={t('app_sidebar.announcements')}>
    {user?.role === "parent" && <ParentChildFilter />}
    {cardView ? (
      isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading announcements…</p> : items.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((announcement, index) => <Card key={announcement._id} className="parent-enter p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${index * 55}ms` }}><div className="flex items-start gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Megaphone size={20} /></span><div className="min-w-0"><Link to={`/list/announcements/${announcement._id}`} className="font-semibold hover:text-primary">{announcement.name}</Link><p className="mt-1 text-sm text-muted-foreground">{announcement.class?.name ?? "School-wide announcement"}</p></div></div><p className="mt-4 line-clamp-4 text-sm text-muted-foreground">{announcement.description}</p><p className="mt-4 text-xs text-muted-foreground">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(announcement.date))}</p></Card>)}</div> : <Card className="p-8 text-center text-sm text-muted-foreground">{user?.role === "student" ? "No announcements are shared with your class right now." : "No announcements are shared with your children right now."}</Card>
    ) : <DataTable data={data} columns={columns} loading={isLoading} />}
    {cardView && items.length > 0 && <ParentInfiniteSentinel sentinelRef={sentinelRef} hasMore={hasMore} loading={loadingMore} />}
  </Section>;
};

export default AnnouncementsPageView;
