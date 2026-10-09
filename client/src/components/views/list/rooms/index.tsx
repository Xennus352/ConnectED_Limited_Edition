import React from "react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/layout";
import { DataTable, useColumns } from "./customs";
import { useRoomService } from "@/services/rooms";

const RoomsPageView: React.FC = () => {
  const { t } = useTranslation();
  const { columns } = useColumns();
  const { getAllRooms } = useRoomService();

  const { data, isLoading } = getAllRooms;

  return (
    <Section id='rooms-page-view' title={t("app_sidebar.rooms")}>
      <DataTable columns={columns} data={data} loading={isLoading} />
    </Section>
  );
};

export default RoomsPageView;