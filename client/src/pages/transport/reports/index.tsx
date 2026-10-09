import React from "react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/layout";
import ReportsPageView from "@/components/views/transport/reports";

const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Section id='transport-reports-page' title={t("app_sidebar.transport_reports")}>
      <ReportsPageView />
    </Section>
  );
};

export default ReportsPage;