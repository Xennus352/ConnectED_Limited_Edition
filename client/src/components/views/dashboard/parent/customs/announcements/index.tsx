import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import DropDown from "../dropdown";
import CardTitle from "../card-title";
import { Card } from "@/components/ui/card";
import { useAnnouncementsService } from "@/services/announcements";

const Announcements: React.FC = () => {
  const { t } = useTranslation();
  const { getAllAnnouncements } = useAnnouncementsService();

  const { data, isLoading } = getAllAnnouncements;

  if(isLoading) {
    return <div>Loading...</div>
  }


  return (
    <Card className='relative p-4'>
      <CardTitle className='mb-2'>
        {t("admin_dashboard.announcements")}
      </CardTitle>
      <DropDown url='/list/announcements' />

      <div className='flex flex-col gap-4'>
        {!data?.data?.length ? (
          <p>{t("admin_dashboard.no_data_available")}</p>
        ) : (
          data?.data?.slice(0, 3).map(({ _id, name, description }: any) => (
            <Card
              key={_id}
              className={`p-4 hover:scale-95 transition-all`}
            >
              <h5 className='text-md font-semibold underline mb-2'>
                <Link to={`/list/announcements/${_id}`}>{name}</Link>
              </h5>
              <p className={`text-sm text-muted-foreground line-clamp-2`}>
                {description}
              </p>
            </Card>
          ))
        )}
      </div>
    </Card>
  );
};

export default Announcements;
