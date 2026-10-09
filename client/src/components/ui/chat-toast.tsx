import React from "react";
import { CheckCheck, MessageCircle, UserPlus } from "lucide-react";

import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import noUser from "@/assets/icons/no-user.svg";

export type ChatToastKind = "message" | "request" | "accepted";

interface ChatToastOptions {
  /** The other user's display name. */
  name: string;
  /** The other user's avatar (optional). */
  photo?: string;
  /** Short preview line shown under the name. */
  preview: string;
  kind: ChatToastKind;
  /** Translated badge text under the name (i18n from the caller). */
  label: string;
}

const KIND_META: Record<
  ChatToastKind,
  { icon: React.ReactNode; tint: string }
> = {
  message: {
    icon: <MessageCircle className="size-3.5" />,
    tint: "bg-sky-500/90 text-white",
  },
  request: {
    icon: <UserPlus className="size-3.5" />,
    tint: "bg-amber-500/90 text-white",
  },
  accepted: {
    icon: <CheckCheck className="size-3.5" />,
    tint: "bg-emerald-500/90 text-white",
  },
};

/**
 * Shows a Telegram-style notification toast: avatar + name + preview,
 * animated in from the top. Uses the shared radix toast stack.
 */
export const chatToast = ({
  name,
  photo,
  preview,
  kind,
  label,
}: ChatToastOptions): void => {
  const meta = KIND_META[kind];

  toast({
    duration: 4000,
    className: cn(
      "chat-toast cursor-default overflow-hidden rounded-2xl border-border/60 bg-card/95 shadow-2xl backdrop-blur-md",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0",
      "data-[state=open]:slide-in-from-top-4 data-[state=open]:zoom-in-95"
    ),
    title: (
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="relative shrink-0">
          <Avatar className="size-9 border border-border/70">
            <AvatarImage src={photo || noUser} alt={name} />
            <AvatarFallback>{name.trim().charAt(0).toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full ring-2 ring-background",
              meta.tint
            )}
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">
            {name}
          </span>
          <span className="block text-xs font-medium capitalize text-muted-foreground">
            {label}
          </span>
        </span>
      </span>
    ),
    description: (
      <span className="line-clamp-2 pl-[46px] text-sm leading-snug text-muted-foreground">
        {preview}
      </span>
    ),
  });
};