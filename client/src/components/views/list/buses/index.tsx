import React from "react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/layout";
import { DataTable, useColumns } from "./customs";
import { useBusesService } from "@/services/transport";

const BusesPageView: React.FC = () => {
  const { t } = useTranslation();
  const { columns } = useColumns();
  const { getAllBuses } = useBusesService();
  const { data, isLoading } = getAllBuses;

  return (
    <Section id='buses-page-view' title={t("app_sidebar.buses")}>
      <DataTable columns={columns} data={data} loading={isLoading} />
    </Section>
  );
};

export default BusesPageView;