import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import useAxiosInstance from "@/api";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch } from "@/hooks/useRedux";
import {
  FleetModalType,
  resetFleetFormModal,
} from "@/store/slices/fleet-form-modal";

/** Entity → API path prefix. Every CRUD router exposes DELETE /:id. */
const DELETE_PATHS: Record<FleetModalType, string> = {
  bus: "/buses",
  route: "/routes",
  trip: "/trips",
  maintenance: "/maintenance",
  fuel: "/fuel",
  incident: "/incidents",
};

/** The query buckets that must refresh after a record disappears. */
const INVALIDATIONS: Record<FleetModalType, string[]> = {
  bus: ["buses", "drivers", "fleet", "snapshot"],
  route: ["routes", "buses"],
  trip: ["trips", "buses", "driver", "trips"],
  maintenance: ["maintenance", "buses", "fleet", "snapshot"],
  fuel: ["fuel"],
  incident: ["incidents"],
};

export const useFleetDelete = (
  entity: FleetModalType
): { runDelete: (id: string) => Promise<any>; deleting: boolean } => {
  const $axios = useAxiosInstance();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const path = DELETE_PATHS[entity];
      const response = await $axios.delete(`${path}/${id}`);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({ title: t("transport_form.delete_success") });
      for (const key of INVALIDATIONS[entity] ?? []) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: error?.response?.data?.message || t("transport_form.action_failed"),
      });
    },
  });

  const runDelete = useCallback(
    async (id: string) => mutation.mutateAsync(id),
    [mutation]
  );

  return { runDelete, deleting: mutation.isPending };
};

const useFleetFormModalFeatures = () => {
  const dispatch = useAppDispatch();

  const handleCloseFleetModal = useCallback(() => {
    dispatch(resetFleetFormModal());
  }, [dispatch]);

  return { handleCloseFleetModal };
};

export default useFleetFormModalFeatures;