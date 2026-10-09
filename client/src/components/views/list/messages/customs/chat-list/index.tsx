import React, { useState } from "react";
import classNames from "classnames";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { MdOutlineAddComment } from "react-icons/md";
import { BiMessageRoundedDots } from "react-icons/bi";
import { Paperclip, Trash2 } from "lucide-react";

import { IConversation } from "@/interfaces/conversation";
import { useRealtime } from "@/providers/socket-provider";
import { TypingDots } from "../chat-thread";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import noUser from "@/assets/icons/no-user.svg";

interface PropsI {
  items: IConversation[] | undefined;
  loading: boolean;
  currentUserId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  /** Delete an accepted conversation from the list (with confirmation). */
  onDelete?: (id: string) => void;
  /** True while the accept request is in flight — locks the button. */
  accepting?: boolean;
}

const ChatList: React.FC<PropsI> = ({
  items,
  loading,
  currentUserId,
  selectedId,
  onSelect,
  onNewChat,
  onAccept,
  onDecline,
  onDelete,
  accepting = false,
}) => {
  const { t } = useTranslation();
  const realtime = useRealtime();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const otherOf = (c: IConversation) =>
    c.participants.find((p) => p._id !== currentUserId);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header + New chat */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h3 className="text-base font-bold">{t("messages.title")}</h3>
        <Button variant="outline" size="sm" onClick={onNewChat}>
          <MdOutlineAddComment className="size-4" />
          {t("messages.new_chat")}
        </Button>
      </div>

      {/* Conversation list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-2 p-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !items?.length ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
            <BiMessageRoundedDots className="size-9" />
            <p className="text-sm">{t("messages.empty")}</p>
          </div>
        ) : (
          items.map((item, index) => {
            const other = otherOf(item);
            const incoming = item.requestedById !== currentUserId;
            const isPending = item.status === "pending";
            const active = item._id === selectedId;
            const online = realtime.isOnline(other?._id);
            const typingNow = realtime.isTyping(item._id, other?._id);
            const hasAttachment = Boolean(item.lastMessage?.attachments?.length);

            const preview = typingNow
              ? null
              : isPending
                ? incoming
                  ? t("messages.incoming_request")
                  : t("messages.waiting_acceptance")
                : item.lastMessage?.text ||
                  (hasAttachment
                    ? item.lastMessage?.attachments?.[0]?.name
                    : t("messages.no_messages"));

            return (
              <div
                key={item._id}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                className={classNames(
                  "group flex flex-col gap-1 border-b border-border px-3 py-2 transition-colors animate-in fade-in-0 slide-in-from-left-2 duration-200",
                  active ? "bg-primary/10" : "hover:bg-accent"
                )}
              >
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelect(item._id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {/* Avatar + presence dot */}
                    <div className="relative shrink-0">
                      <Avatar className="size-10 ring-1 ring-border">
                        <AvatarImage
                          src={other?.profilePhoto || noUser}
                          alt={other?.fullName}
                        />
                        <AvatarFallback>
                          {other?.fullName?.slice(0, 1) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {online && (
                        <span
                          aria-label={t("messages.online")}
                          className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-success animate-in zoom-in-0 duration-200"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {other?.fullName || t("messages.unknown_user")}
                        </p>
                        {item.lastMessage ? (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {format(new Date(item.lastMessage.createdAt), "HH:mm")}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        {typingNow ? (
                          <p className="inline-flex min-w-0 items-center gap-1.5 truncate text-sm text-primary">
                            <span>{t("messages.typing")}</span>
                            <TypingDots />
                          </p>
                        ) : (
                          <p className="truncate text-sm text-muted-foreground">
                            {item.lastMessage?.senderId === currentUserId &&
                              !isPending && (
                                <span className="text-foreground/70">
                                  {t("messages.you_prefix")}
                                </span>
                              )}
                            {hasAttachment &&
                              !item.lastMessage?.text && (
                                <Paperclip className="mr-1 inline size-3.5" />
                              )}
                            {preview}
                          </p>
                        )}
                        {item.unreadCount > 0 ? (
                          <span
                            key={item.unreadCount}
                            className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground animate-in zoom-in-0 duration-200"
                          >
                            {item.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>

                  {/* Delete chat — hidden until hover (incoming pending uses Decline) */}
                  {!(isPending && incoming) && onDelete && (
                    <button
                      type="button"
                      aria-label={t("messages.delete_chat")}
                      title={t("messages.delete_chat")}
                      onClick={() => setConfirmDelete(item._id)}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>

                {/* Pending incoming request — accept / decline inline */}
                {isPending && incoming && (
                  <div className="flex items-center gap-2 animate-in fade-in-0 duration-200">
                    <Button
                      size="sm"
                      className="h-8 flex-1"
                      disabled={accepting}
                      onClick={() => onAccept?.(item._id)}
                    >
                      {t("messages.accept")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1"
                      onClick={() => onDecline?.(item._id)}
                    >
                      {t("messages.decline")}
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("messages.delete_chat_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("messages.delete_chat_body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("messages.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) onDelete?.(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              {t("messages.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatList;
