import { useState } from "react";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";

import { TUser } from "@/interfaces/user";
import { IAttachment } from "@/interfaces/conversation";
import { useConversationService } from "@/services/messages";

/**
 * State + services for the two-pane Messages view (chat list on the left,
 * thread on the right). The selected conversation drives the thread query.
 */
export const useMessagesFeatures = () => {
  const user = useAuthUser() as TUser;
  const {
    getConversations,
    createConversation,
    acceptConversation,
    removeConversation,
    sendMessage,
    blockConversation,
    unblockConversation,
  } = useConversationService();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);

  const currentUserId = user?._id;

  const openConversation = (id: string) => setSelectedId(id);

  const startChat = async (toUserId: string, text: string) => {
    const created = await createConversation.mutateAsync({ toUserId, text });
    if (created?._id) {
      setSelectedId(created._id);
      setNewChatOpen(false);
    }
    return created;
  };

  const accept = (id: string) => acceptConversation.mutate(id);

  /** Decline (pending) / delete (accepted): removes the chat for me. */
  const remove = (id: string) => {
    if (selectedId === id) setSelectedId(null);
    removeConversation.mutate(id);
  };

  const send = (
    conversationId: string,
    text: string,
    attachments?: IAttachment[]
  ) => sendMessage.mutate({ conversationId, text, attachments });

  const block = (id: string) => blockConversation.mutate(id);
  const unblock = (id: string) => unblockConversation.mutate(id);

  return {
    currentUserId,
    getConversations,
    selectedId,
    openConversation,
    newChatOpen,
    setNewChatOpen,
    startChat,
    accept,
    decline: remove,
    remove,
    send,
    block,
    unblock,
    sending: sendMessage.isPending,
    accepting: acceptConversation.isPending,
    blocking: blockConversation.isPending || unblockConversation.isPending,
  };
};
