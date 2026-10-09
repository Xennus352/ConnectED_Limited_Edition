import i18n from "i18next";
import HttpApi from "i18next-http-backend";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(LanguageDetector)
  .use(HttpApi)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    backend: {
      // `?rev=` busts any stale i18next/HTTP caches so newly added
      // translation keys (e.g. driver_form.*, teacher_dashboard.*, the
      // fleet/attendance blocks) are picked up on reload.
      loadPath: "/locale/{{lng}}/{{ns}}.json?rev=9",
    },
    detection: {
      order: [
        "localStorage",
        "querystring",
        "cookie",
        "navigator",
        "htmlTag",
        "path",
        "subdomain",
      ],
      caches: ["localStorage"],
    },
  });

export default i18n;
