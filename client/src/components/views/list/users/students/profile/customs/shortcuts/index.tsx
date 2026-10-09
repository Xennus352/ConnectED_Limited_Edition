import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Card, CardTitle } from "@/components/ui/card";

const Shortcuts: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Card className="relative p-4">
      <CardTitle className="mb-2 text-lg">{t('students_list_profile.shortcuts')}</CardTitle>
      <div className="flex flex-col gap-2">
        <Link
          to="/list/groups"
          className="text-primary hover:underline rounded-md text-sm font-semibold p-2 
          bg-primary/10 
          hover:bg-primary/20"
        >
          {t('app_sidebar.classes')}
        </Link>

        <Link
          to="/list/assignments"
          className="text-success hover:underline rounded-md text-sm font-semibold p-2 
          bg-success/10 
          hover:bg-success/20"
        >
       {t('app_sidebar.assignments')}
        </Link>
      </div>
    </Card>
  );
};

export default Shortcuts;
