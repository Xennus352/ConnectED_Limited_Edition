import React from "react";
import { Link } from "react-router-dom";
import { Card, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const Shortcuts: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Card className="relative p-4">
      <CardTitle className="mb-2 text-lg">{t('teachers_list_profile.shortcuts')}</CardTitle>
      <div className="flex flex-col gap-2">
        <Link
          to="/list/classes"
          className="text-primary hover:underline rounded-md text-sm font-semibold p-2 
          bg-primary/10 
          hover:bg-primary/20"
        >
          {t('app_sidebar.classes')}
        </Link>

        <Link
          to="/list/lessons"
          className="text-warning hover:underline rounded-md text-sm font-semibold p-2 
          bg-warning/15 
          hover:bg-warning/25"
        >
          {t('app_sidebar.lessons')}
        </Link>

        <Link
          to="/list/exams"
          className="text-warning hover:underline rounded-md text-sm font-semibold p-2 
          bg-warning/15 
          hover:bg-warning/25"
        >
          {t('app_sidebar.exams')}
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
