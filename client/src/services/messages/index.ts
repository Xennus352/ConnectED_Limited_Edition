import { useToast } from "@/hooks/use-toast";
import useQueryHandler from "@/hooks/useQueryHandler";
import useAxiosInstance from "@/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IAttachment,
  IConversation,
  IMessage,
  IDirectoryUser,
} from "@/interfaces/conversation";

export const conversationsKey = ["conversations"] as const;

/**
 * Conversations + realtime messages.
 * REST contract (server):
 *   GET   /conversations                      -> my conversations (newest first)
 *   POST  /conversations/create  {toUserId,text} -> start a pending request
 *   PUT   /conversations/:id/accept
 *   PUT   /conversations/:id/block | /unblock -> block management
 *   DELETE /conversations/:id
 *   GET   /conversations/:id/messages         -> messages (marks unread as read)
 *   POST  /conversations/:id/messages/create {text, attachments?}
 *   POST  /upload/file (multipart `file`)     -> chat attachment metadata
 *   GET   /users/directory?q=                 -> pick a user to start a chat
 * Socket events consumed by the UI: conversation:new, conversation:updated,
 *   conversation:removed, message:new, message:read, presence:*, typing
 */
export const useConversationService = () => {
  const $axios = useAxiosInstance();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    // `exact` is essential: the open-thread key ["conversations", id, "messages"]
    // is nested under conversationsKey, and a prefix match here would refetch
    // the thread too — whose own queryFn then invalidates again (infinite loop).
    queryClient.invalidateQueries({ queryKey: conversationsKey, exact: true });
  };

  const getConversations = useQueryHandler({
    queryKey: [...conversationsKey],
    queryFn: async (): Promise<IConversation[]> => {
      const response = await $axios.get("/conversations");
      return response?.data?.data || [];
    },
  });

  const createConversation = useMutation({
    mutationFn: async (body: { toUserId: string; text: string }) => {
      const response = await $axios.post("/conversations/create", body);
      return response?.data?.data as IConversation;
    },
    onSuccess: () => invalidate(),
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: error?.response?.data?.message || "Could not start the conversation",
      });
    },
  });

  const acceptConversation = useMutation({
    mutationFn: async (id: string) => {
      const response = await $axios.put(`/conversations/${id}/accept`);
      return response?.data?.data as IConversation;
    },
    onSuccess: () => invalidate(),
    onError: (error: any) => {
      // 409 = someone (usually our own double-click or a socket refresh)
      // already accepted it — just resync instead of alarming the user.
      if (error?.response?.status === 409) {
        invalidate();
        return;
      }
      toast({
        variant: "destructive",
        title: error?.response?.data?.message || "Could not accept the request",
      });
    },
  });

  const removeConversation = useMutation({
    mutationFn: async (id: string) => {
      const response = await $axios.delete(`/conversations/${id}`);
      return response?.data;
    },
    onSuccess: () => invalidate(),
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: error?.response?.data?.message || "Could not remove the conversation",
      });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (body: {
      conversationId: string;
      text: string;
      attachments?: IAttachment[];
    }) => {
      const response = await $axios.post(
        `/conversations/${body.conversationId}/messages/create`,
        { text: body.text, attachments: body.attachments ?? [] }
      );
      return response?.data?.data as IMessage;
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: error?.response?.data?.message || "Could not send the message",
      });
    },
  });

  const blockConversation = useMutation({
    mutationFn: async (id: string) => {
      const response = await $axios.put(`/conversations/${id}/block`);
      return response?.data?.data as IConversation;
    },
    onSuccess: () => invalidate(),
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: error?.response?.data?.message || "Could not block this user",
      });
    },
  });

  const unblockConversation = useMutation({
    mutationFn: async (id: string) => {
      const response = await $axios.put(`/conversations/${id}/unblock`);
      return response?.data?.data as IConversation;
    },
    onSuccess: () => invalidate(),
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: error?.response?.data?.message || "Could not unblock this user",
      });
    },
  });

  return {
    getConversations,
    createConversation,
    acceptConversation,
    removeConversation,
    sendMessage,
    blockConversation,
    unblockConversation,
    invalidate,
  };
};

/**
 * Uploads one chat attachment (POST /api/upload/file) and returns the
 * metadata the message endpoint expects.
 */
export const useUploadFile = () => {
  const $axios = useAxiosInstance();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File): Promise<IAttachment> => {
      const form = new FormData();
      form.append("file", file);
      const response = await $axios.post("/upload/file", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response?.data?.file as IAttachment;
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: error?.response?.data?.message || "Could not upload the file",
      });
    },
  });
};

/** Messages of one conversation; only enabled once an id is selected. */
export const useConversationMessages = (conversationId: string | null) => {
  const $axios = useAxiosInstance();
  const queryClient = useQueryClient();

  return useQueryHandler({
    queryKey: ["conversations", conversationId ?? "none", "messages"],
    queryFn: async (): Promise<IMessage[]> => {
      if (!conversationId) return [];
      const response = await $axios.get(`/conversations/${conversationId}/messages`);
      // Reading marks unread as read — refresh the list badge counts live.
      // Exact match only: a prefix match would re-invalidate THIS query and
      // the refetches would feed each other in an endless loop.
      queryClient.invalidateQueries({ queryKey: conversationsKey, exact: true });
      return response?.data?.data || [];
    },
    enabled: Boolean(conversationId),
  });
};

/** Directory search used by the "new chat" picker. */
export const useDirectorySearch = (q: string, enabled: boolean) => {
  const $axios = useAxiosInstance();

  return useQueryHandler({
    queryKey: ["directory", q],
    queryFn: async (): Promise<IDirectoryUser[]> => {
      const response = await $axios.get("/users/directory", {
        params: { q: q || undefined, limit: 20 },
      });
      return response?.data?.data || [];
    },
    enabled,
  });
};

/**
 * Total unread messages across conversations — drives the sidebar's
 * Messages badge. Shares the conversations query key, so it stays in
 * sync with the realtime socket invalidations for free.
 */
export const useUnreadMessagesCount = (): number => {
  const $axios = useAxiosInstance();

  const { data } = useQueryHandler({
    queryKey: [...conversationsKey],
    queryFn: async (): Promise<IConversation[]> => {
      const response = await $axios.get("/conversations");
      return response?.data?.data || [];
    },
    select: (conversations: IConversation[]) =>
      (conversations || []).reduce(
        (total, conversation) => total + (conversation.unreadCount || 0),
        0
      ),
  });

  return typeof data === "number" ? data : 0;
};