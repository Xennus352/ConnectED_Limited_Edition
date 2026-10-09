import { z } from "zod";
import { useTranslation } from "react-i18next";

const useSubjectValidation = () => {
  const { t } = useTranslation();

  const validateSubject = z.object({
    name: z
      .string({ required_error: t("subject_form.name_required") })
      .min(1, { message: t("subject_form.name_required") }),
    // Image is optional: allow an empty string or a valid URL.
    imgUrl: z.union([
      z.literal(""),
      z.string().url({ message: t("subject_form.invalid_imgUrl") }),
    ]),
    description: z.string({
      required_error: t("subject_form.description_required"),
    }),
    status: z.string({ required_error: t("subject_form.status_required") }),
  });

  return {
    validateSubject,
  };
};

export default useSubjectValidation;
