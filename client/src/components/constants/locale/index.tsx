import React from "react";
import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useLocalFeatures from "./features";

interface LocalePropsI {
  className?: string;
}

const Locale: React.FC<LocalePropsI> = ({ className }) => {
  const { t } = useTranslation();
  const { onLanguageHandler, capitalizedLang, currentLang } = useLocalFeatures();

  return (
    <Select onValueChange={(e: string) => onLanguageHandler(e)} defaultValue={currentLang}>
      <SelectTrigger
        className={`${className} py-2`}
      >
        <SelectValue placeholder={capitalizedLang}   />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='en'>{t("locale.en")}</SelectItem>
        <SelectItem value='mm'>{t("locale.mm")}</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default Locale;