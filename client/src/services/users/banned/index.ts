import { useToast } from "@/hooks/use-toast";
import useQueryHandler from "@/hooks/useQueryHandler";
import useAxiosInstance from "@/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IDirectoryUser } from "@/interfaces/conversation";

/** A banned user as returned by `GET /api/users/banned`. */
export interface IBannedUser extends IDirectoryUser {
  isBanned: boolean;
  fullName: string;
  [key: string]: unknown;
}

export const bannedKey = ["users", "banned"] as const;

export const useBannedService = () => {
  const $axios = useAxiosInstance();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: bannedKey });
    queryClient.invalidateQueries({ queryKey: ["directory"] });
  };

  const getBannedUsers = useQueryHandler({
    queryKey: [...bannedKey],
    queryFn: async (): Promise<IBannedUser[]> => {
      const response = await $axios.get("/users/banned");
      return response?.data?.data || [];
    },
  });

  const banUser = useMutation({
    mutationFn: async (userId: string) => {
      const response = await $axios.put(`/users/${userId}/ban`);
      return response?.data?.data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "User banned" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: error?.response?.data?.message || "Could not ban the user",
      });
    },
  });

  const unbanUser = useMutation({
    mutationFn: async (userId: string) => {
      const response = await $axios.put(`/users/${userId}/unban`);
      return response?.data?.data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "User unbanned" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: error?.response?.data?.message || "Could not unban the user",
      });
    },
  });

  return { getBannedUsers, banUser, unbanUser };
};