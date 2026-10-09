import React, { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IoArrowBack } from "react-icons/io5";

import { useMessagesFeatures } from "./customs/features";
import ChatList from "./customs/chat-list";
import ChatThread from "./customs/chat-thread";
import NewChatDialog from "./customs/new-chat-dialog";
import { useConversationMessages } from "@/services/messages";
import { setActiveChatId } from "@/lib/chat-focus";
import { IAttachment, IConversation } from "@/interfaces/conversation";

const MessagesView: React.FC = () => {
  const features = useMessagesFeatures();
  const queryClient = useQueryClient();

  const {
    currentUserId,
    getConversations,
    selectedId,
    openConversation,
    newChatOpen,
    setNewChatOpen,
    startChat,
    accept,
    decline,
    remove,
    send,
    block,
    unblock,
    sending,
    accepting,
  } = features;

  const { data: conversations, isLoading } = getConversations;
  const messagesQuery = useConversationMessages(selectedId);

  const selectedConversation = conversations?.find(
    (c: IConversation) => c._id === selectedId
  );

  const handleSend = (text: string, attachments?: IAttachment[]) => {
    if (!selectedId) return;
    send(selectedId, text, attachments);
    queryClient.invalidateQueries({
      queryKey: ["conversations", selectedId, "messages"],
    });
  };

  // Tell the realtime layer which chat is on screen so incoming messages for
  // it are silent on toasts (the chime still plays) — Telegram behaviour.
  useEffect(() => {
    setActiveChatId(selectedId || null);
    return () => setActiveChatId(null);
  }, [selectedId]);
  return (
    <div className="h-[calc(100vh-120px)] overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      {/* Mobile: conversation list (no selection) */}
      {!selectedId && (
        <div className="h-full md:hidden">
          <ChatList
            items={conversations}
            loading={isLoading}
            currentUserId={currentUserId}
            selectedId={selectedId}
            onSelect={openConversation}
            onNewChat={() => setNewChatOpen(true)}
            onAccept={accept}
            onDecline={decline}
            onDelete={remove}
            accepting={accepting}
          />
        </div>
      )}

      {/* Mobile: thread (a conversation is open) */}
      {selectedId && (
        <>
          <div className="flex h-full flex-col md:hidden">
            <div className="flex items-center border-b border-border px-2 py-1">
              <button
                type="button"
                onClick={() => openConversation("")}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-primary hover:bg-accent"
              >
                <IoArrowBack className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ChatThread
                conversation={selectedConversation}
                messages={messagesQuery.data}
                loading={messagesQuery.isLoading}
                currentUserId={currentUserId}
                onSend={handleSend}
                sending={sending}
                onBlock={block}
                onUnblock={unblock}
                onDelete={remove}
              />
            </div>
          </div>
        </>
      )}

      {/* Desktop: two panes */}
      <div className="hidden h-full grid-cols-[320px_1fr] grid-rows-[minmax(0,1fr)] md:grid">
        <div className="min-h-0 min-w-0 border-r border-border">
          <ChatList
            items={conversations}
            loading={isLoading}
            currentUserId={currentUserId}
            selectedId={selectedId}
            onSelect={openConversation}
            onNewChat={() => setNewChatOpen(true)}
            onAccept={accept}
            onDecline={decline}
            onDelete={remove}
            accepting={accepting}
          />
        </div>
        <div className="min-h-0 min-w-0">
          <ChatThread
            conversation={selectedConversation}
            messages={messagesQuery.data}
            loading={messagesQuery.isLoading}
            currentUserId={currentUserId}
            onSend={handleSend}
            sending={sending}
            onBlock={block}
            onUnblock={unblock}
            onDelete={remove}
          />
        </div>
      </div>

      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        onStart={startChat}
      />
    </div>
  );
};

export default MessagesView;