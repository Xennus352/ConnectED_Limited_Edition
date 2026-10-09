import React from "react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/layout";
import { DataTable, useColumns } from "./customs";
import { useFuelService } from "@/services/transport";

const FuelPageView: React.FC = () => {
  const { t } = useTranslation();
  const { columns } = useColumns();
  const { getAllFuel } = useFuelService();
  const { data, isLoading } = getAllFuel;

  return (
    <Section id='fuel-page-view' title={t("app_sidebar.fuel")}>
      <DataTable columns={columns} data={data} loading={isLoading} />
    </Section>
  );
};

export default FuelPageView;