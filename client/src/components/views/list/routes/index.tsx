import React from "react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/layout";
import { DataTable, useColumns } from "./customs";
import { useRoutesService } from "@/services/transport";

const RoutesPageView: React.FC = () => {
  const { t } = useTranslation();
  const { columns } = useColumns();
  const { getAllRoutes } = useRoutesService();
  const { data, isLoading } = getAllRoutes;

  return (
    <Section id='routes-page-view' title={t("app_sidebar.routes")}>
      <DataTable columns={columns} data={data} loading={isLoading} />
    </Section>
  );
};

export default RoutesPageView;