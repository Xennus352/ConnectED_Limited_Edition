import React from "react";
import Performance from "@/components/generic/performance";
import { useTranslation } from "react-i18next";

const ParentComponent: React.FC = () => {
  const { t } = useTranslation();

  const performanceData = [
    { name: "Class A", value: 92, fill: "hsl(var(--chart-4))" },
    { name: "Class B", value: 8, fill: "hsl(var(--warning))" },
  ];

  return (
    <Performance
      title={t('students_list_profile.performance')}
      chartData={performanceData}
      centerLabelValue="9.2"
      centerLabelDescription="of 10 max LTS"
      footerText="1st Semester - 2nd Semester"
    />
  );
};

export default ParentComponent;
