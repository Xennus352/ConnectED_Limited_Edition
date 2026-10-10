import type { Server, Socket } from "socket.io";

import { prisma } from "./config/prisma";
import { verifyToken } from "./lib/jwt";
import { resolveDriverBusId } from "./modules/transportation/fleet";

let io: Server | null = null;

export const setIo = (server: Server): void => {
  io = server;
};

export const getIo = (): Server | null => io;

export const userRoom = (userId: string): string => `user:${userId}`;

export const BROADCAST_ROOM = "broadcast";

// ---------------------------------------------------------------------------
// Transportation rooms — realtime bus telemetry is NEVER sent to everyone.
//
//   fleet:all      -> admins / super-admins (fleet-wide subscription)
//   bus:<busId>    -> the driver assigned to that bus + parents whose
//                     children ride it. Joined server-side at handshake.
//
// A socket only ever lands in the rooms its role is entitled to, so
// authorization lives on the backend — frontend filtering is cosmetic.
// ---------------------------------------------------------------------------

/** Room every admin/super-admin socket joins for fleet-wide telemetry. */
export const FLEET_ROOM = "fleet:all";

/** Room for a single vehicle's telemetry (driver of that bus + its parents). */
export const busRoom = (busId: string): string => `bus:${busId}`;

/** The role carried by the JWT — authoritative, never client-supplied. */
const roleOf = (decoded: { role?: string }): string =>
  String(decoded?.role ?? "").toLowerCase();

/**
 * Resolves the bus ids a user is allowed to receive telemetry for.
 * Returns `null` for fleet-wide (admin) access, `[]` for none.
 */
const authorizedBusIds = async (
  userId: string,
  role: string
): Promise<string[] | null> => {
  if (role === "admin" || role === "super-admin") return null;

  if (role === "driver") {
    // Either pointer (`Driver.busId` or `Bus.driverId`) proves assignment.
    const busId = await resolveDriverBusId(userId);
    return busId ? [busId] : [];
  }

  if (role === "parent") {
    const children = await prisma.student.findMany({
      where: { parentId: userId },
      select: {
        // Students ride a bus through their BusStudentAssignment.
        busAssignments: {
          where: { isActive: true },
          select: { busId: true },
        },
      },
    });

    const busIds = new Set<string>();
    for (const child of children) {
      for (const assignment of child.busAssignments ?? []) {
        if (assignment.busId) busIds.add(assignment.busId);
      }
    }
    return [...busIds];
  }

  if (role === "student") {
    const assignment = await prisma.busStudentAssignment.findFirst({
      where: { studentId: userId, isActive: true },
      orderBy: { assignedAt: "desc" },
      select: { busId: true },
    });
    return assignment?.busId ? [assignment.busId] : [];
  }

  // Teachers get no fleet telemetry by default.
  return [];
};

/**
 * Joins the realtime rooms the connected socket's role is entitled to.
 * Called on every handshake so an assignment change is picked up on
 * reconnect rather than trusted from the client.
 */
const joinTransportRooms = async (socket: Socket, userId: string, role: string): Promise<void> => {
  try {
    const busIds = await authorizedBusIds(userId, role);

    if (busIds === null) {
      // Fleet-wide subscription (admin / super-admin).
      socket.join(FLEET_ROOM);
      socket.data.fleetWide = true;
      return;
    }

    socket.data.busIds = busIds;
    for (const busId of busIds) socket.join(busRoom(busId));
  } catch {
    // Fail closed: a socket that cannot resolve its permissions joins
    // no transportation room at all.
    socket.data.busIds = [];
  }
};

export interface BusTelemetryPayload {
  busId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  status: string;
  timestamp: string;
}

/**
 * Emits `bus:location` only to authorized subscribers: admins (fleet-wide)
 * and sockets that joined `bus:<busId>` (that bus' driver and its parents).
 */
export const emitBusLocation = (payload: BusTelemetryPayload): void => {
  if (!io) return;
  io.to(FLEET_ROOM).to(busRoom(payload.busId)).emit("bus:location", payload);
};

/**
 * Emits `bus:status` (trip start/stop and other status flips) to the same
 * authorized audience as `bus:location`.
 */
export const emitBusStatus = (payload: {
  busId: string;
  status: string;
  lastLocationAt?: string | null;
  timestamp?: string;
}): void => {
  if (!io) return;
  const event = {
    ...payload,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };
  io.to(FLEET_ROOM).to(busRoom(payload.busId)).emit("bus:status", event);
};

/**
 * Trip lifecycle changes (`trip:updated`) go to the same authorized audience
 * as bus telemetry: the fleet room (admins) plus the bus room (that bus'
 * driver and the parents whose children ride it).
 */
export const emitTripUpdate = (
  tripId: string,
  busId: string,
  status: string,
  extra?: Record<string, unknown>
): void => {
  if (!io) return;
  io.to(FLEET_ROOM)
    .to(busRoom(busId))
    .emit("trip:updated", {
      tripId,
      busId,
      status,
      timestamp: new Date().toISOString(),
      ...extra,
    });
};

/** Maintenance workflow changes — administration surface, fleet room only. */
export const emitMaintenanceUpdate = (
  busId: string,
  recordId: string,
  status: string
): void => {
  if (!io) return;
  io.to(FLEET_ROOM).emit("maintenance:updated", {
    busId,
    recordId,
    status,
    timestamp: new Date().toISOString(),
  });
};

/** Non-telemetry admin list changes (fuel / incidents / trips / buses / routes). */
export const emitFleetListUpdate = (
  type: "fuel" | "incidents" | "trips" | "maintenance" | "buses" | "routes",
  kind: "created" | "updated" | "deleted",
  id?: string
): void => {
  if (!io) return;
  io.to(FLEET_ROOM).emit("fleet:list-update", {
    type,
    kind,
    id,
    timestamp: new Date().toISOString(),
  });
};

const socketsByUser = new Map<string, Set<string>>();
const lastSeenByUser = new Map<string, string>();

/** A user is online when at least one of their sockets is connected. */
export const isOnline = (userId: string): boolean =>
  (socketsByUser.get(userId)?.size ?? 0) > 0;

/** ISO timestamp of the moment a user's last socket disconnected. */
export const lastSeenOf = (userId: string): string | null =>
  lastSeenByUser.get(userId) ?? null;

export const emitToUser = (userId: string, event: string, payload: unknown): void => {
  io?.to(userRoom(userId)).emit(event, payload);
};

export const emitToUsers = (userIds: string[], event: string, payload: unknown): void => {
  for (const id of [...new Set(userIds)]) {
    emitToUser(id, event, payload);
  }
};

export type ResourceType =
  | "events"
  | "announcements"
  | "assignments"
  | "attendance"
  | "results"
  | "exams"
  | "lessons"
  | "classes"
  | "subjects"
  | "parents"
  | "students"
  | "teachers"
  | "admins"
  | "users"
  | "conversations"
  | "messages"
  | "buses"
  | "routes"
  | "routestops"
  | "bus-assignments"
  | "bus-locations"
  | "trips"
  | "maintenance"
  | "fuel"
  | "incidents";

export interface ResourceEventPayload<T = unknown> {
  type: ResourceType;
  id?: string;
  data?: T;
}

export const emitResourceEvent = <T = unknown>(
  event: "resource:created" | "resource:updated" | "resource:deleted",
  payload: ResourceEventPayload<T>
): void => {
  io?.to(BROADCAST_ROOM).emit(event, payload);
};

export const joinBroadcast = (socket: Socket): void => {
  socket.join(BROADCAST_ROOM);
};

/**
 * Attaches the connection handler
 */
export const setupSockets = (ioServer: Server): void => {
  setIo(ioServer);

  ioServer.on("connection", (socket: Socket) => {
    const token = socket.handshake.auth?.token;
    let userId: string;
    let role = "";

    try {
      if (typeof token !== "string" || !token) {
        throw new Error("missing token");
      }
      const decoded: any = verifyToken(token);
      userId = decoded.sub || decoded.id;
      if (!userId) throw new Error("missing subject");
      role = roleOf(decoded);
    } catch {
      socket.disconnect(true);
      return;
    }

    socket.data.userId = userId;
    socket.data.role = role;
    socket.join(userRoom(userId));
    joinBroadcast(socket);

    // Transportation telemetry: join only the rooms this role may see.
    void joinTransportRooms(socket, userId, role);

    const siblings = socketsByUser.get(userId) ?? new Set<string>();
    const wasOffline = siblings.size === 0;
    siblings.add(socket.id);
    socketsByUser.set(userId, siblings);
    lastSeenByUser.delete(userId);

    // Hand the fresh connection the current presence picture, then — when
    // this was the user's first socket — announce them online to everyone.
    socket.emit("presence:list", {
      onlineUserIds: [...socketsByUser.keys()],
      lastSeen: Object.fromEntries(lastSeenByUser),
    });
    if (wasOffline) {
      socket.broadcast.emit("presence:update", { userId, online: true });
    }

    /**
     * Typing only flows over an accepted conversation shared by both users.
     * Client supplied recipient ids are never sufficient authorization.
     */
    socket.on(
      "typing",
      async (payload: { conversationId?: string; toUserId?: string; isTyping?: boolean }) => {
        const toUserId = payload?.toUserId;
        const conversationId = payload?.conversationId;
        if (!toUserId || toUserId === userId || typeof conversationId !== "string" || !/^[a-f\d]{24}$/i.test(conversationId)) {
          return;
        }
        try {
          const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { participantIds: true, status: true },
          });
          if (conversation?.status !== "accepted" || !conversation.participantIds.includes(userId) || !conversation.participantIds.includes(toUserId)) return;
        } catch {
          return;
        }
        emitToUser(toUserId, "typing", {
          conversationId,
          userId,
          isTyping: Boolean(payload.isTyping),
        });
      }
    );

    socket.on("disconnect", () => {
      const current = socketsByUser.get(userId);
      if (!current) return;
      current.delete(socket.id);
      if (current.size === 0) {
        socketsByUser.delete(userId);
        const seenAt = new Date().toISOString();
        lastSeenByUser.set(userId, seenAt);
        io?.to(BROADCAST_ROOM).emit("presence:update", {
          userId,
          online: false,
          lastSeenAt: seenAt,
        });
      }
    });
  });
};

export default setupSockets;
