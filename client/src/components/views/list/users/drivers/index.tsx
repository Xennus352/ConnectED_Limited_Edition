import React from "react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/layout";
import { DataTable, useColumns } from "./customs";
import { useDriverService } from "@/services/users/drivers";

const DriversPageView: React.FC = () => {
  const { t } = useTranslation();
  const { columns } = useColumns();
  const { getAllDrivers } = useDriverService();
  const { data, isLoading } = getAllDrivers;

  return (
    <Section id='drivers-page-view' title={t("app_sidebar.drivers")}>
      <DataTable data={data} columns={columns} loading={isLoading} />
    </Section>
  );
};

export default DriversPageView;