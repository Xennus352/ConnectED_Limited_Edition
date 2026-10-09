import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import useAxiosInstance from "@/api";
import { useToast } from "@/hooks/use-toast";
import useQueryHandler from "@/hooks/useQueryHandler";
import { IPaginationParams } from "@/interfaces/pagination";

export const useRoomService = () => {
  const param = useParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  const $axios = useAxiosInstance();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const roomId = searchParams.get("roomId") || param?.roomId;

  // Get limit and page from search params
  const getLimit = useCallback(() => {
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    return [10, 20, 50, 100].includes(limit) ? limit : 10;
  }, [searchParams]);

  const getPage = useCallback(() => {
    return parseInt(searchParams.get("page") || "1", 10);
  }, [searchParams]);

  const getSearch = useCallback(() => {
    return searchParams.get("search") || "";
  }, [searchParams]);

  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);

    const limit = getLimit();
    if (parseInt(searchParams.get("limit") || "10", 10) !== limit) {
      newSearchParams.set("limit", limit.toString());
      setSearchParams(newSearchParams);
    }
  }, [searchParams, setSearchParams, getLimit]);

  const params: IPaginationParams = {
    limit: getLimit(),
    page: getPage(),
  };

  const search = getSearch();
  if (search) {
    params.search = search;
  }

  const getAllRooms = useQueryHandler({
    queryKey: ["rooms", params],
    queryFn: async () => {
      const response = await $axios.get("/rooms", { params });

      return response?.data;
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("room_form.failed_to_fetch_rooms"),
      });
    },
  });

  const getAllRoomsUnpaginated = useQueryHandler({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await $axios.get("/rooms", { params: { search } });

      return response?.data?.data || [];
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("room_form.failed_to_fetch_rooms"),
      });
    },
  });

  const getRoomById = useQueryHandler({
    queryKey: ["rooms", roomId],
    queryFn: async () => {
      if (!roomId) return null;

      const response = await $axios.get(`/rooms/${roomId}`);
      return response?.data?.data;
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("room_form.failed_to_fetch_room"),
      });
    },
  });

  const createRoom = useMutation({
    mutationFn: async (body: object) => {
      const response = await $axios.post("/rooms/create", body);
      return response?.data?.data;
    },
    onSuccess: () => {
      toast({
        title: t("room_form.room_created_successfully"),
      });

      queryClient.invalidateQueries({
        queryKey: ["rooms"],
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title:
          error?.response?.data?.message ||
          t("room_form.failed_to_create_room"),
      });
    },
  });

  const updateRoom = useMutation({
    mutationFn: async (body: object) => {
      const response = await $axios.put(`/rooms/${roomId}`, body);
      return response?.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["rooms"],
      });

      toast({
        title: t("room_form.room_updated_successfully"),
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title:
          error?.response?.data?.message ||
          t("room_form.failed_to_update_room"),
      });
    },
  });

  const deleteRoom = useMutation({
    mutationFn: async () => {
      const response = await $axios.delete(`/rooms/${roomId}`);
      return response?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["rooms"],
      });

      toast({
        title: t("room_form.room_deleted_successfully"),
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title:
          error?.response?.data?.message ||
          t("room_form.failed_to_delete_room"),
      });
    },
  });

  return {
    getAllRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom,
    getAllRoomsUnpaginated,
  };
};
