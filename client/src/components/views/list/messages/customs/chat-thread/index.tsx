import React, { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { IoSend } from "react-icons/io5";
import { FaUserClock } from "react-icons/fa6";
import { PhotoProvider, PhotoView } from "react-photo-view";
import {
  Ban,
  Check,
  CheckCheck,
  FileText,
  MoreVertical,
  Paperclip,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import {
  IAttachment,
  IConversation,
  IMessage,
  IUserRef,
} from "@/interfaces/conversation";
import { useRealtime } from "@/providers/socket-provider";
import { useUploadFile } from "@/services/messages";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import noUser from "@/assets/icons/no-user.svg";

interface PropsI {
  conversation: IConversation | undefined;
  messages: IMessage[] | undefined;
  loading: boolean;
  currentUserId: string;
  onSend: (text: string, attachments?: IAttachment[]) => void;
  sending?: boolean;
  onBlock?: (id: string) => void;
  onUnblock?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Telegram-style bouncing dots for the typing indicator. */
export const TypingDots: React.FC<{ className?: string }> = ({ className }) => (
  <span className={classNames("inline-flex items-end gap-0.5", className)}>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="size-1.5 rounded-full bg-current animate-[typing-bounce_1s_ease-in-out_infinite]"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </span>
);

const ChatThread: React.FC<PropsI> = ({
  conversation,
  messages,
  loading,
  currentUserId,
  onSend,
  sending,
  onBlock,
  onUnblock,
  onDelete,
}) => {
  const { t } = useTranslation();
  const realtime = useRealtime();
  const uploadFile = useUploadFile();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear the composer when switching conversations.
  useEffect(() => {
    setText("");
    setFiles([]);
  }, [conversation?._id]);

  // Auto-scroll to the newest message. On conversation switch jump straight
  // to the bottom; on new messages only follow along when the user is already
  // near the bottom (so reading older history never gets yanked down).
  useEffect(() => {
    const vp = viewportRef.current;
    if (vp) vp.scrollTo({ top: vp.scrollHeight, behavior: "auto" });
  }, [conversation?._id]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const nearBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight < 140;
    if (nearBottom) vp.scrollTo({ top: vp.scrollHeight, behavior: "smooth" });
  }, [messages?.length, loading]);

  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <FaUserClock className="size-12" />
        <p className="text-base">{t("messages.select_conversation")}</p>
      </div>
    );
  }

  const other: IUserRef | undefined = conversation.participants.find(
    (p) => p._id !== currentUserId
  );
  const amIRequester = conversation.requestedById === currentUserId;
  const isAccepted = conversation.status === "accepted";
  const canSend = isAccepted;

  const blockedById = conversation.blockedById ?? null;
  const iBlocked = blockedById === currentUserId;
  const theyBlocked = Boolean(blockedById) && !iBlocked;

  const online = realtime.isOnline(other?._id);
  const typingNow = realtime.isTyping(conversation._id, other?._id);

  /** "Online" · "Last seen 14:05" · "Last seen recently" — Telegram style. */
  const presenceLabel = (): string => {
    if (online) return t("messages.online");
    const iso = realtime.lastSeenAt(other?._id);
    if (!iso) return t("messages.last_seen_recently");
    const when = new Date(iso);
    const sameDay = when.toDateString() === new Date().toDateString();
    const date = sameDay
      ? format(when, "HH:mm")
      : format(when, "MMM d, HH:mm");
    return t("messages.last_seen", { date });
  };

  const statusLine = () => {
    if (iBlocked) {
      return <span className="text-destructive">{t("messages.blocked_by_you")}</span>;
    }
    if (theyBlocked) {
      return <span className="text-destructive">{t("messages.blocked_you")}</span>;
    }
    if (!isAccepted) {
      return (
        <span className="text-warning">
          {amIRequester
            ? t("messages.waiting_acceptance")
            : t("messages.incoming_request")}
        </span>
      );
    }
    if (typingNow) {
      return (
        <span className="inline-flex items-center gap-1.5 text-primary">
          <TypingDots />
          <span>{t("messages.typing")}</span>
        </span>
      );
    }
    return (
      <span className={online ? "text-success" : "text-muted-foreground"}>
        {presenceLabel()}
      </span>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if ((!value && !files.length) || !canSend || sending || uploading) return;

    if (other?._id) realtime.stopTyping(conversation._id, other._id);

    // Files first: upload, then send one message carrying the attachments.
    if (files.length) {
      setUploading(true);
      try {
        const attachments: IAttachment[] = await Promise.all(
          files.map((file) => uploadFile.mutateAsync(file))
        );
        onSend(value, attachments);
        setText("");
        setFiles([]);
      } catch {
        // useUploadFile's onError already surfaced a toast; keep the drafts.
      } finally {
        setUploading(false);
      }
      return;
    }

    onSend(value);
    setText("");
  };

  const removeFile = (index: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const composerBlocked = iBlocked || theyBlocked;

  return (
    <div
      key={conversation._id}
      className="flex h-full min-h-0 min-w-0 flex-col animate-in fade-in-0 duration-200"
    >
      {/* Thread header: avatar + name + presence/typing + actions */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <div className="relative shrink-0">
          <Avatar className="size-10 ring-1 ring-border">
            <AvatarImage src={other?.profilePhoto || noUser} alt={other?.fullName} />
            <AvatarFallback>{other?.fullName?.slice(0, 1) || "?"}</AvatarFallback>
          </Avatar>
          {online && (
            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-card bg-success animate-in zoom-in-0 duration-200"
            >
              <span className="absolute inset-0 rounded-full bg-success animate-ping" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">
            {other?.fullName || t("messages.unknown_user")}
          </p>
          <p className="truncate text-sm">{statusLine()}</p>
        </div>

        {isAccepted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("messages.chat_actions")}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {iBlocked ? (
                <DropdownMenuItem onSelect={() => onUnblock?.(conversation._id)}>
                  <ShieldCheck className="mr-2 size-4" />
                  {t("messages.unblock_user")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  disabled={theyBlocked}
                  onSelect={() => onBlock?.(conversation._id)}
                >
                  <Ban className="mr-2 size-4" />
                  {t("messages.block_user")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => onDelete?.(conversation._id)}
              >
                <Trash2 className="mr-2 size-4" />
                {t("messages.delete_chat")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Accept gate for incoming pending requests */}
      {!isAccepted && !amIRequester && (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-accent/40 px-4 py-2">
          <p className="text-sm text-muted-foreground">
            {t("messages.gate_hint")}
          </p>
        </div>
      )}

      {/* Messages */}
      <ScrollArea viewportRef={viewportRef} className="min-h-0 flex-1">
        <PhotoProvider>
          <div className="flex flex-col gap-2 px-4 py-3">
            {loading ? (
              <>
                <Skeleton className="h-10 w-2/3 self-end" />
                <Skeleton className="h-10 w-1/2 self-start" />
                <Skeleton className="h-10 w-1/3 self-end" />
              </>
            ) : !messages?.length ? (
              <p className="mx-auto text-sm text-muted-foreground">
                {t("messages.no_messages_yet")}
              </p>
            ) : (
              messages.map((msg) => {
                const mine = msg.senderId === currentUserId;
                const attachments = msg.attachments ?? [];
                const isImage = (a: IAttachment) => a.type?.startsWith("image/");

                return (
                  <div
                    key={msg._id}
                    className={classNames(
                      "max-w-[75%] animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
                      mine ? "self-end" : "self-start"
                    )}
                  >
                    <div
                      className={classNames(
                        "rounded-2xl px-3 py-2 text-base break-words",
                        mine
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-secondary text-secondary-foreground"
                      )}
                    >
                      {/* Image attachments — click for the full-screen viewer */}
                      {attachments.some(isImage) && (
                        <div className="mb-1.5 grid grid-cols-2 gap-1.5">
                          {attachments
                            .filter(isImage)
                            .map((a) => (
                              <PhotoView key={a.url} src={a.url}>
                                <img
                                  src={a.url}
                                  alt={a.name}
                                  loading="lazy"
                                  className="h-32 w-full cursor-zoom-in rounded-lg object-cover animate-in fade-in-0 duration-300"
                                />
                              </PhotoView>
                            ))}
                        </div>
                      )}

                      {/* File attachments — open in a new tab */}
                      {attachments
                        .filter((a) => !isImage(a))
                        .map((a) => (
                          <a
                            key={a.url}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className={classNames(
                              "mb-1.5 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors animate-in fade-in-0 duration-200",
                              mine
                                ? "bg-primary-foreground/15 hover:bg-primary-foreground/25"
                                : "bg-background/60 hover:bg-background"
                            )}
                          >
                            <FileText className="size-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">
                              {a.name}
                            </span>
                            <span
                              className={classNames(
                                "shrink-0 text-xs",
                                mine ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}
                            >
                              {formatBytes(a.size)}
                            </span>
                          </a>
                        ))}

                      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                      <div
                        className={classNames(
                          "mt-0.5 flex items-center justify-end gap-1 text-xs",
                          mine ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}
                      >
                        <span>{format(new Date(msg.createdAt), "HH:mm")}</span>
                        {mine &&
                          (msg.readAt ? (
                            <CheckCheck
                              className="size-4 text-primary-foreground transition-colors duration-300"
                              aria-label={t("messages.read")}
                            />
                          ) : (
                            <Check
                              className="size-4 text-primary-foreground/60"
                              aria-label={t("messages.sent")}
                            />
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing bubble */}
            {typingNow && (
              <div className="self-start rounded-2xl rounded-bl-md bg-secondary px-4 py-2.5 text-secondary-foreground animate-in fade-in-0 slide-in-from-bottom-1 duration-150">
                <TypingDots className="text-primary" />
              </div>
            )}
            <div ref={endRef} />
          </div>
        </PhotoProvider>
      </ScrollArea>

      {/* Blocked banner replaces the composer */}
      {composerBlocked ? (
        <div className="flex flex-col items-center gap-2 border-t border-border px-4 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            {iBlocked ? t("messages.blocked_by_you") : t("messages.blocked_you")}
          </p>
          {iBlocked && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUnblock?.(conversation._id)}
            >
              {t("messages.unblock_user")}
            </Button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="border-t border-border">
          {/* Attachment previews */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="group relative flex items-center gap-2 rounded-lg border border-border bg-accent/40 py-1.5 pl-2 pr-7 text-sm"
                >
                  {file.type.startsWith("image/") ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="size-8 rounded object-cover"
                    />
                  ) : (
                    <FileText className="size-5 text-muted-foreground" />
                  )}
                  <span className="max-w-36 truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    aria-label={t("messages.remove_attachment")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 p-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) {
                  setFiles((prev) => [
                    ...prev,
                    ...Array.from(e.target.files as FileList),
                  ].slice(0, 10));
                }
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!canSend || uploading}
              aria-label={t("messages.attach_file")}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </Button>

            <input
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (other?._id) {
                  realtime.startTyping(conversation._id, other._id);
                }
              }}
              placeholder={
                composerBlocked
                  ? t("messages.blocked_you")
                  : uploading
                    ? t("messages.uploading")
                    : t("messages.type_message")
              }
              disabled={!canSend || uploading}
              className="h-10 w-full rounded-full border border-input bg-transparent px-4 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!canSend || !text.trim() || sending || uploading}
              aria-label={t("messages.send")}
              className="shrink-0"
            >
              {uploading ? (
                <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <IoSend className="size-4" />
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ChatThread;
