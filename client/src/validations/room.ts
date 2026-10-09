import { z } from "zod";
import { useTranslation } from "react-i18next";

const useRoomValidation = () => {
  const { t } = useTranslation();

  const validateRoom = z.object({
    name: z
      .string({ required_error: t("room_form.name_required") })
      .min(1, { message: t("room_form.name_required") }),
    capacity: z.coerce
      .number({ required_error: t("room_form.capacity_required") })
      .min(1, { message: t("room_form.capacity_required") }),
  });

  return {
    validateRoom,
  };
};

export default useRoomValidation;