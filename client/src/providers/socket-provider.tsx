import React, { useEffect, useRef } from "react";
import useAuthHeader from "react-auth-kit/hooks/useAuthHeader";
import useSignOut from "react-auth-kit/hooks/useSignOut";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";
import { useReactAuthKit } from "react-auth-kit/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

import i18n from "@/i18n";
import { getSocket, getActiveSocket, stripBearer, disconnectSocket } from "@/lib/socket";
import {
  initNotificationSound,
  playNotificationSound,
} from "@/lib/notification-sound";
import { getActiveChatId } from "@/lib/chat-focus";
import { chatToast } from "@/components/ui/chat-toast";
import { conversationsKey } from "@/services/messages";
import { IAttachment, IConversation, IMessage } from "@/interfaces/conversation";
import { TUser } from "@/interfaces/user";

interface PropsI {
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Realtime state (presence + typing) exposed to the rest of the app
// ---------------------------------------------------------------------------

interface TypingEntry {
  userId: string;
  at: number;
}

export interface RealtimeValue {
  /** userId -> online (true/absent). */
  onlineIds: Record<string, boolean>;
  /** userId -> ISO timestamp of the last disconnect. */
  lastSeen: Record<string, string>;
  /** conversationId -> who is typing right now. */
  typing: Record<string, TypingEntry>;
  isOnline: (userId?: string | null) => boolean;
  lastSeenAt: (userId?: string | null) => string | null;
  isTyping: (conversationId: string | null, userId?: string | null) => boolean;
  startTyping: (conversationId: string, toUserId: string) => void;
  stopTyping: (conversationId: string, toUserId: string) => void;
}

const noop = () => {};
const defaultRealtime: RealtimeValue = {
  onlineIds: {},
  lastSeen: {},
  typing: {},
  isOnline: () => false,
  lastSeenAt: () => null,
  isTyping: () => false,
  startTyping: noop,
  stopTyping: noop,
};

const RealtimeContext = React.createContext<RealtimeValue>(defaultRealtime);

/** Presence (online / last seen) and typing indicators for the chat UI. */
export const useRealtime = (): RealtimeValue => React.useContext(RealtimeContext);

/** Typing stops being shown after this long without a refresh ping. */
const TYPING_TTL = 5000;
/** Minimum gap between two `typing` emits while the user keeps typing. */
const TYPING_THROTTLE = 1200;
/** The server-side typing state expires unless we ping again. */
const TYPING_REPING = 2500;

/**
 * Connects the socket.io client once the user is authenticated and wires
 * the realtime chat events to the conversation queries so the UI stays
 * in sync without polling. Publishes presence + typing through context and
 * listens for `user:banned` so a freshly banned user is signed out instantly.
 */
const SocketProvider: React.FC<PropsI> = ({ children }) => {
  const authHeader = useAuthHeader();
  const authUser = useAuthUser<TUser>() as TUser | null;
  const signOut = useSignOut();
  const queryClient = useQueryClient();
  const authUserRef = useRef(authUser);
  const [, bumpAuth] = React.useReducer((n: number) => n + 1, 0);

  authUserRef.current = authUser;

  const [onlineIds, setOnlineIds] = React.useState<Record<string, boolean>>({});
  const [lastSeen, setLastSeen] = React.useState<Record<string, string>>({});
  const [typing, setTyping] = React.useState<Record<string, TypingEntry>>({});

  // Typing emit throttling (per conversation).
  const typingState = useRef({
    lastSent: new Map<string, number>(),
    timers: new Map<string, ReturnType<typeof setTimeout>>(),
  });

  /**
   * react-auth-kit's AuthProvider exposes the stable TokenObject through
   * context, not the auth state itself, so context consumers do NOT
   * re-render on sign-in/sign-out. This provider sits above the router, so
   * navigation re-renders can't save it either — without a subscription the
   * socket would only connect after a full page reload. Subscribe to the
   * store so the effect below re-runs (and the ban handler sees the right
   * user) the moment auth changes.
   */
  const tokenObject = useReactAuthKit();
  React.useEffect(() => {
    if (typeof tokenObject?.subscribe !== "function") return;
    const subscription = tokenObject.subscribe(() => bumpAuth()) as unknown as {
      unsubscribe?: () => void;
    };
    return () => subscription?.unsubscribe?.();
  }, [tokenObject]);

  useEffect(() => {
    const token = stripBearer(authHeader);
    const socket = getSocket(token);

    if (!socket) {
      // Signed out (or not signed in yet): drop any lingering connection so
      // a later sign-in — possibly as a different user — starts a fresh,
      // correctly authenticated handshake.
      disconnectSocket();
      return;
    }

    const invalidate = (key: string[], exact = false) => {
      queryClient.invalidateQueries({ queryKey: key, exact });
    };

    // ---- Notification chime + toasts --------------------------------------
    // Browsers only allow audio after a user gesture — hook the unlock once.
    initNotificationSound();

    const t = i18n.t.bind(i18n);

    const messagePreview = (m: {
      text?: string;
      attachments?: IAttachment[];
    }): string => {
      if (m.text?.trim()) return m.text.trim().slice(0, 140);
      const first = m.attachments?.[0];
      if (first) return first.name || first.type || t("notifications.attachment");
      return t("notifications.new_message_body");
    };

    const findParticipant = (conversationId: string, userId: string) => {
      const list = queryClient.getQueryData<IConversation[]>(conversationsKey);
      const conv = list?.find((c) => c._id === conversationId);
      return conv?.participants.find((p) => p._id === userId);
    };

    // `exact` keeps these list refreshes from also matching the nested
    // open-thread key ["conversations", id, "messages"] (which would loop).
    const onConversationNew = (payload: IConversation) => {
      invalidate([...conversationsKey], true);
      // Only notify for requests OTHER people send me.
      const me = authUserRef.current?._id;
      if (!me || !payload?._id || payload.requestedById === me) return;
      const other = payload.participants?.find((p) => p._id !== me);
      playNotificationSound();
      chatToast({
        name: other?.fullName ?? t("notifications.someone"),
        photo: other?.profilePhoto,
        preview: t("notifications.request_body"),
        kind: "request",
        label: t("notifications.new_request"),
      });
    };
    const onConversationUpdated = () => invalidate([...conversationsKey], true);
    const onConversationAccepted = (payload: IConversation) => {
      invalidate([...conversationsKey], true);
      const me = authUserRef.current?._id;
      if (!me || !payload?._id) return;
      // Only the requester learns from a toast that their request was
      // accepted — the recipient pressed the button themselves.
      if (payload.requestedById !== me || payload.status !== "accepted") return;
      const other = payload.participants?.find((p) => p._id !== me);
      playNotificationSound();
      chatToast({
        name: other?.fullName ?? t("notifications.someone"),
        photo: other?.profilePhoto,
        preview: t("notifications.accepted_body"),
        kind: "accepted",
        label: t("notifications.accepted"),
      });
    };
    const onConversationRemoved = () => invalidate([...conversationsKey], true);
    const onMessageNew = (payload: {
      _id?: string;
      conversationId?: string;
      senderId?: string;
      text?: string;
      attachments?: IAttachment[];
    }) => {
      // Refresh both the list (badges / last message) and the open thread.
      invalidate([...conversationsKey], true);
      if (payload?.conversationId) {
        invalidate(["conversations", payload.conversationId, "messages"]);
      }
      const me = authUserRef.current?._id;
      // Nothing to announce when the message is my own (echoed from another tab).
      if (!me || !payload?.conversationId || payload.senderId === me) return;
      playNotificationSound();
      // No popup for the chat the user is already reading (Telegram style).
      if (getActiveChatId() === payload.conversationId) return;
      const sender = findParticipant(payload.conversationId, payload.senderId!);
      chatToast({
        name: sender?.fullName ?? t("notifications.someone"),
        photo: sender?.profilePhoto,
        preview: messagePreview(payload),
        kind: "message",
        label: t("notifications.new_message"),
      });
    };
    const onBanned = (payload: { userId?: string }) => {
      if (
        payload?.userId &&
        authUserRef.current &&
        payload.userId === authUserRef.current._id
      ) {
        disconnectSocket();
        signOut();
      }
    };

    // ---- Presence ---------------------------------------------------------
    const onPresenceList = (payload: {
      onlineUserIds?: string[];
      lastSeen?: Record<string, string>;
    }) => {
      const online: Record<string, boolean> = {};
      for (const id of payload?.onlineUserIds ?? []) online[id] = true;
      setOnlineIds(online);
      setLastSeen(payload?.lastSeen ?? {});
    };
    const onPresenceUpdate = (payload: {
      userId?: string;
      online?: boolean;
      lastSeenAt?: string;
    }) => {
      if (!payload?.userId) return;
      setOnlineIds((prev) => ({ ...prev, [payload.userId!]: Boolean(payload.online) }));
      if (payload.online) {
        setLastSeen((prev) => {
          if (!prev[payload.userId!]) return prev;
          const next = { ...prev };
          delete next[payload.userId!];
          return next;
        });
      } else if (payload.lastSeenAt) {
        setLastSeen((prev) => ({ ...prev, [payload.userId!]: payload.lastSeenAt! }));
      }
    };

    // ---- Typing -----------------------------------------------------------
    const onTyping = (payload: {
      conversationId?: string;
      userId?: string;
      isTyping?: boolean;
    }) => {
      if (!payload?.conversationId || !payload.userId) return;
      if (!payload.isTyping) {
        setTyping((prev) => {
          if (!prev[payload.conversationId!]) return prev;
          const next = { ...prev };
          delete next[payload.conversationId!];
          return next;
        });
        return;
      }
      setTyping((prev) => ({
        ...prev,
        [payload.conversationId!]: { userId: payload.userId!, at: Date.now() },
      }));
    };

    // ---- Read receipts (my sent bubbles flip to ✓✓) -----------------------
    const onMessageRead = (payload: {
      conversationId?: string;
      readerId?: string;
      readAt?: string;
      messageIds?: string[];
    }) => {
      if (!payload?.conversationId || !payload.readAt) return;
      const me = authUserRef.current?._id;
      if (!me || payload.readerId === me) return; // I was the reader, not the sender

      queryClient.setQueryData<IMessage[]>(
        ["conversations", payload.conversationId, "messages"],
        (old) =>
          (old ?? []).map((m) =>
            m.senderId === me &&
            m.readAt === null &&
            (!payload.messageIds?.length || payload.messageIds.includes(m._id))
              ? { ...m, readAt: payload.readAt! }
              : m
          )
      );
    };

    socket.on("conversation:new", onConversationNew);
    socket.on("conversation:updated", onConversationUpdated);
    socket.on("conversation:accepted", onConversationAccepted);
    socket.on("conversation:removed", onConversationRemoved);
    socket.on("message:new", onMessageNew);
    socket.on("message:read", onMessageRead);
    socket.on("presence:list", onPresenceList);
    socket.on("presence:update", onPresenceUpdate);
    socket.on("typing", onTyping);
    socket.on("user:banned", onBanned);

    return () => {
      socket.off("conversation:new", onConversationNew);
      socket.off("conversation:updated", onConversationUpdated);
      socket.off("conversation:accepted", onConversationAccepted);
      socket.off("conversation:removed", onConversationRemoved);
      socket.off("message:new", onMessageNew);
      socket.off("message:read", onMessageRead);
      socket.off("presence:list", onPresenceList);
      socket.off("presence:update", onPresenceUpdate);
      socket.off("typing", onTyping);
      socket.off("user:banned", onBanned);
    };
  }, [authHeader, queryClient, signOut]);

  // Stale typing entries (no refresh ping within TTL) fade out on their own.
  useEffect(() => {
    const timer = setInterval(() => {
      setTyping((prev) => {
        const now = Date.now();
        const stale = Object.entries(prev).filter(([, v]) => now - v.at > TYPING_TTL);
        if (!stale.length) return prev;
        const next = { ...prev };
        for (const [key] of stale) delete next[key];
        return next;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      for (const timer of typingState.current.timers.values()) clearTimeout(timer);
      typingState.current.timers.clear();
    };
  }, []);

  const startTyping = React.useCallback((conversationId: string, toUserId: string) => {
    const socket = getActiveSocket();
    if (!socket || !conversationId || !toUserId) return;

    const now = Date.now();
    const state = typingState.current;
    const last = state.lastSent.get(conversationId) ?? 0;
    if (now - last < TYPING_THROTTLE) return;

    state.lastSent.set(conversationId, now);
    socket.emit("typing", { conversationId, toUserId, isTyping: true });

    // Keep pinging while the user continues, and auto-stop when they don't.
    const existing = state.timers.get(conversationId);
    if (existing) clearTimeout(existing);
    state.timers.set(
      conversationId,
      setTimeout(() => {
        state.timers.delete(conversationId);
        state.lastSent.delete(conversationId);
        socket.emit("typing", { conversationId, toUserId, isTyping: false });
      }, TYPING_REPING)
    );
  }, []);

  const stopTyping = React.useCallback((conversationId: string, toUserId: string) => {
    const state = typingState.current;
    const timer = state.timers.get(conversationId);
    if (timer) {
      clearTimeout(timer);
      state.timers.delete(conversationId);
      state.lastSent.delete(conversationId);
      getActiveSocket()?.emit("typing", { conversationId, toUserId, isTyping: false });
    }
  }, []);

  const value = React.useMemo<RealtimeValue>(
    () => ({
      onlineIds,
      lastSeen,
      typing,
      isOnline: (userId) => Boolean(userId && onlineIds[userId]),
      lastSeenAt: (userId) => (userId ? lastSeen[userId] ?? null : null),
      isTyping: (conversationId, userId) => {
        if (!conversationId) return false;
        const entry = typing[conversationId];
        return Boolean(entry && (!userId || entry.userId === userId));
      },
      startTyping,
      stopTyping,
    }),
    [onlineIds, lastSeen, typing, startTyping, stopTyping]
  );

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  );
};

export default SocketProvider;
