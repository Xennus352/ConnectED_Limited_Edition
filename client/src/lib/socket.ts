import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Callbacks fired the moment a socket is created. Feature modules (the live
 * fleet, for example) bind their own listeners here so they work no matter
 * which component created the connection first.
 */
const creationListeners = new Set<(s: Socket) => void>();

export const onSocketCreated = (listener: (s: Socket) => void): (() => void) => {
  creationListeners.add(listener);
  return () => {
    creationListeners.delete(listener);
  };
};

/**
 * Returns a lazily-created socket.io client connected to the API origin
 * with an authenticated handshake (`auth.token`, raw JWT — the "Bearer "
 * prefix must be stripped in the caller). Returns null while there is no
 * token yet.
 */
export const getSocket = (token: string | null | undefined): Socket | null => {
  if (!token) return null;

  if (socket) return socket;

  const origin =
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
      /\/api$/,
      ""
    ) ||
    "http://localhost:8000";

  socket = io(origin, {
    transports: ["websocket", "polling"],
    auth: { token },
  });

  // Exposed so integrations/tests can force a clean disconnect() instead of
  // relying on heartbeat timeouts after abrupt closes.
  (window as unknown as Record<string, unknown>).__connectEdSocket = socket;

  for (const listener of creationListeners) listener(socket);

  return socket;
};

/** Get the raw JWT (without the "Bearer " prefix) from an auth header. */
export const stripBearer = (header: string | null | undefined): string | null => {
  if (!header) return null;
  return header.replace(/^Bearer\s+/i, "").trim() || null;
};

/** The live socket, if one is currently connected (typing emits, etc.). */
export const getActiveSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export { io, type Socket };