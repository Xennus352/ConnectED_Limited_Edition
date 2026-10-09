import React from "react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/layout";
import { DataTable, useColumns } from "./customs";
import { useMaintenanceService } from "@/services/transport";

const MaintenancePageView: React.FC = () => {
  const { t } = useTranslation();
  const { columns } = useColumns();
  const { getAllMaintenance } = useMaintenanceService();
  const { data, isLoading } = getAllMaintenance;

  return (
    <Section id='maintenance-page-view' title={t("app_sidebar.maintenance")}>
      <DataTable columns={columns} data={data} loading={isLoading} />
    </Section>
  );
};

export default MaintenancePageView;