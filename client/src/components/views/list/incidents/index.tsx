import React from "react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/layout";
import { DataTable, useColumns } from "./customs";
import { useIncidentsService } from "@/services/transport";

const IncidentsPageView: React.FC = () => {
  const { t } = useTranslation();
  const { columns } = useColumns();
  const { getAllIncidents } = useIncidentsService();
  const { data, isLoading } = getAllIncidents;

  return (
    <Section id='incidents-page-view' title={t("app_sidebar.incidents")}>
      <DataTable columns={columns} data={data} loading={isLoading} />
    </Section>
  );
};

export default IncidentsPageView;