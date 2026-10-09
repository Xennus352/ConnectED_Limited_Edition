import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import { MdOutlineSearch } from "react-icons/md";

import { IDirectoryUser } from "@/interfaces/conversation";
import { useDirectorySearch } from "@/services/messages";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import noUser from "@/assets/icons/no-user.svg";

interface PropsI {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (toUserId: string, text: string) => Promise<unknown> | void;
}

/**
 * Picks a user from the directory and writes the first message — that
 * creates the *pending* request. Chat only opens once the recipient accepts.
 */
const NewChatDialog: React.FC<PropsI> = ({ open, onOpenChange, onStart }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<IDirectoryUser | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useDirectorySearch(query, open);

  const handlePick = (u: IDirectoryUser) => {
    setSelected(u);
    setMessage("");
  };

  const handleStart = async () => {
    if (!selected || !message.trim() || busy) return;
    setBusy(true);
    try {
      await onStart(selected._id, message.trim());
      setQuery("");
      setSelected(null);
      setMessage("");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("messages.new_chat")}</DialogTitle>
          <DialogDescription>{t("messages.new_chat_hint")}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <MdOutlineSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder={t("messages.search_placeholder")}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Directory results */}
        <div className="max-h-52 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : !data?.length ? (
            <p className="p-3 text-center text-xs text-muted-foreground">
              {t("messages.no_users_found")}
            </p>
          ) : (
            data.map((u: IDirectoryUser) => {
              const active = selected?._id === u._id;
              return (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => handlePick(u)}
                  className={classNames(
                    "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left",
                    active ? "bg-primary/10" : "hover:bg-accent"
                  )}
                >
                  <Avatar className="size-9">
                    <AvatarImage src={u.profilePhoto || noUser} alt={u.fullName} />
                    <AvatarFallback>{u.fullName?.slice(0, 1) || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {u.fullName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{u.username} · {u.role}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* First message (becomes the request body) */}
        {selected && (
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("messages.first_message_placeholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleStart();
            }}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("button.cancel")}
          </Button>
          <Button onClick={handleStart} disabled={!selected || !message.trim() || busy}>
            {t("messages.send_request")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewChatDialog;