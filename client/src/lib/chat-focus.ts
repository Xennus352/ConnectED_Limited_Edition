/**
 * Tracks which conversation the user is currently reading in the Messages
 * view. The realtime layer uses this to suppress notification toasts for the
 * open chat (Telegram behaviour) while still playing the chime.
 *
 * This is a tiny module-global shared between the Messages view (writer) and
 * the socket provider (reader) — deliberately not React state, so the socket
 * handlers never need to re-subscribe when the selection changes.
 */

let activeConversationId: string | null = null;

export const getActiveChatId = (): string | null => activeConversationId;

export const setActiveChatId = (id: string | null): void => {
  activeConversationId = id;
};