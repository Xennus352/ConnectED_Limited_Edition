import React from "react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/layout";
import { DataTable, useColumns } from "./customs";
import { useTripsService } from "@/services/transport";

const TripsPageView: React.FC = () => {
  const { t } = useTranslation();
  const { columns } = useColumns();
  const { getAllTrips } = useTripsService();
  const { data, isLoading } = getAllTrips;

  return (
    <Section id='trips-page-view' title={t("app_sidebar.trips")}>
      <DataTable columns={columns} data={data} loading={isLoading} />
    </Section>
  );
};

export default TripsPageView;