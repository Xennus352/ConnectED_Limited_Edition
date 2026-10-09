import { Router } from "express";

import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors";
import { isObjectId } from "../../lib/query";
import { mapDoc } from "../../lib/serialize";
import { findUserById, findUsersByIds, userSummary } from "../../lib/users";
import { emitToUser, emitToUsers } from "../../sockets";

/**
 * Conversations are a request → accept flow between two users of any of the
 * four user models. `participantIds` stores exactly two ids; participants are
 * resolved across the models on read because MongoDB has no joins.
 *
 * All routes are behind `requireAuth` and only ever expose conversations the
 * caller is part of.
 */
export const conversationsRouter = Router();

const MAX_TEXT = 2000;
const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const readText = (raw: unknown): string => {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (text.length > MAX_TEXT) {
    throw badRequest(`Message text must be ${MAX_TEXT} characters or fewer`);
  }
  return text;
};

interface AttachmentInput {
  url: string;
  name: string;
  type: string;
  size: number;
}

/**
 * Accepts the `attachments` array produced by POST /api/upload/file and
 * normalizes it. Anything malformed is rejected rather than stored.
 */
const readAttachments = (raw: unknown): AttachmentInput[] => {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw badRequest("attachments must be an array");
  if (raw.length > MAX_ATTACHMENTS) {
    throw badRequest(`A message can carry at most ${MAX_ATTACHMENTS} attachments`);
  }

  return raw.map((item: any) => {
    const url = typeof item?.url === "string" ? item.url.trim() : "";
    if (!url || !url.includes("/uploads/")) {
      throw badRequest("Attachment url must point at an uploaded file");
    }
    const size = Number(item?.size ?? 0);
    if (!Number.isFinite(size) || size < 0 || size > MAX_ATTACHMENT_SIZE) {
      throw badRequest("Attachment is too large");
    }
    return {
      url,
      name: String(item?.name ?? "file").slice(0, 200),
      type: String(item?.type ?? "application/octet-stream").slice(0, 100),
      size,
    };
  });
};

const meOf = (req: { user?: { id?: string } }): string => {
  const id = req.user?.id;
  if (!id) throw notFound("Conversation not found");
  return id;
};

const loadConversation = async (raw: unknown) => {
  if (!isObjectId(raw)) throw notFound("Conversation not found");

  const conversation = await prisma.conversation.findUnique({
    where: { id: raw },
  });
  if (!conversation) throw notFound("Conversation not found");

  return conversation;
};

interface ParticipantDoc {
  _id: string;
  fullName: string;
  profilePhoto: string;
  role: string;
  model: string;
}

/**
 * Shapes conversations the way the client reads them. `viewerId` decides the
 * `unreadCount`, so the same conversation carries a different number for each
 * participant.
 */
const buildItems = async (
  conversations: any[],
  viewerId: string
): Promise<Array<Record<string, any>>> => {
  const convIds = conversations.map((c) => c.id);
  const users = await findUsersByIds(
    conversations.flatMap((c) => c.participantIds ?? [])
  );

  const messages = convIds.length
    ? await prisma.message.findMany({
        where: { conversationId: { in: convIds } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const byConversation = new Map<string, any[]>();
  for (const message of messages) {
    const list = byConversation.get(message.conversationId) ?? [];
    list.push(message);
    byConversation.set(message.conversationId, list);
  }

  return conversations.map((conversation) => {
    const list = byConversation.get(conversation.id) ?? [];
    const lastMessage = list[list.length - 1] ?? null;
    const unreadCount = list.filter(
      (m) => m.senderId !== viewerId && m.readAt === null
    ).length;

    const participants = (conversation.participantIds ?? [])
      .map((id: string) => {
        const located = users.get(id);
        return located ? userSummary(located) : null;
      })
      .filter((p: ParticipantDoc | null): p is ParticipantDoc => Boolean(p));

    return {
      _id: conversation.id,
      status: conversation.status,
      requestedById: conversation.requestedById,
      blockedById: conversation.blockedById ?? null,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      participants,
      lastMessage: lastMessage
        ? {
            text: lastMessage.text,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId,
            attachments: (lastMessage.attachments as any[]) ?? [],
          }
        : null,
      unreadCount,
    };
  });
};

/** Pushes a conversation to both participants, shaped for each of them. */
const emitConversation = async (event: string, conversation: any) => {
  const ids: string[] = Array.from(
    new Set<string>(conversation.participantIds ?? [] as string[])
  );
  const items = await Promise.all(
    ids.map((id) => buildItems([conversation], id).then((i) => i[0]))
  );

  ids.forEach((id, index) => emitToUser(id, event, items[index]));
};

// ---------------------------------------------------------------------------
// GET /api/conversations
// ---------------------------------------------------------------------------
conversationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const me = meOf(req);

    const rows = await prisma.conversation.findMany({
      where: { participantIds: { has: me } },
      orderBy: { updatedAt: "desc" },
    });

    const data = await buildItems(rows, me);

    res.json({
      success: true,
      data,
      meta: { total: data.length, skip: 0, limit: data.length, page: 1 },
    });
  })
);

// ---------------------------------------------------------------------------
// POST /api/conversations/create        { toUserId, text }
// ---------------------------------------------------------------------------
conversationsRouter.post(
  "/create",
  asyncHandler(async (req, res) => {
    const me = meOf(req);
    const toUserId = String(req.body?.toUserId ?? "").trim();
    const text = readText(req.body?.text);

    if (!toUserId) throw badRequest("toUserId is required");
    if (!text) throw badRequest("Message text is required");
    if (toUserId === me) {
      throw badRequest("You cannot start a conversation with yourself");
    }

    const recipient = await findUserById(toUserId);
    if (!recipient) throw badRequest("Unknown recipient");

    const existing = await prisma.conversation.findFirst({
      where: { participantIds: { hasEvery: [me, toUserId] } },
    });
    if (existing) {
      throw conflict("You already have a conversation with this user");
    }

    const conversation = await prisma.conversation.create({
      data: {
        participantIds: [me, toUserId],
        requestedById: me,
        status: "pending",
      },
    });

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: me,
        text,
      },
    });

    await emitConversation("conversation:new", conversation);

    const items = await buildItems([conversation], me);
    res.json({ success: true, data: items[0] });
  })
);

// ---------------------------------------------------------------------------
// PUT /api/conversations/:id/accept
// ---------------------------------------------------------------------------
conversationsRouter.put(
  "/:id/accept",
  asyncHandler(async (req, res) => {
    const me = meOf(req);
    const conversation = await loadConversation(req.params.id);

    const recipientId = conversation.participantIds.find(
      (id: string) => id !== conversation.requestedById
    );
    if (recipientId !== me) {
      throw forbidden("Only the recipient can accept this conversation request");
    }
    if (conversation.status === "accepted") {
      throw conflict("This conversation has already been accepted");
    }

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: "accepted" },
    });

    await emitConversation("conversation:updated", updated);
    // Dedicated event so clients can tell "my request got accepted" apart
    // from the generic conversation:updated (block/unblock also emit that).
    await emitConversation("conversation:accepted", updated);

    const items = await buildItems([updated], me);
    res.json({ success: true, data: items[0] });
  })
);

// ---------------------------------------------------------------------------
// DELETE /api/conversations/:id
// ---------------------------------------------------------------------------
conversationsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const me = meOf(req);
    const conversation = await loadConversation(req.params.id);

    if (!conversation.participantIds.includes(me)) {
      throw notFound("Conversation not found");
    }

    await prisma.message.deleteMany({
      where: { conversationId: conversation.id },
    });
    await prisma.conversation.delete({ where: { id: conversation.id } });

    const other = conversation.participantIds.find((id: string) => id !== me);
    if (other) emitToUser(other, "conversation:removed", { conversationId: conversation.id });

    res.json({ success: true, data: { conversationId: conversation.id } });
  })
);

// ---------------------------------------------------------------------------
// PUT /api/conversations/:id/block      { }   — only a participant can block
// PUT /api/conversations/:id/unblock    { }   — only the blocker unblocks
// ---------------------------------------------------------------------------
conversationsRouter.put(
  "/:id/block",
  asyncHandler(async (req, res) => {
    const me = meOf(req);
    const conversation = await loadConversation(req.params.id);

    if (!conversation.participantIds.includes(me)) {
      throw notFound("Conversation not found");
    }
    if (conversation.blockedById === me) {
      throw conflict("You have already blocked this user");
    }
    if (conversation.blockedById) {
      throw forbidden("This user has blocked you");
    }

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { blockedById: me },
    });

    await emitConversation("conversation:updated", updated);

    const items = await buildItems([updated], me);
    res.json({ success: true, data: items[0] });
  })
);

conversationsRouter.put(
  "/:id/unblock",
  asyncHandler(async (req, res) => {
    const me = meOf(req);
    const conversation = await loadConversation(req.params.id);

    if (!conversation.participantIds.includes(me)) {
      throw notFound("Conversation not found");
    }
    if (conversation.blockedById !== me) {
      throw forbidden(
        conversation.blockedById ? "Only the blocker can unblock this user" : "This user is not blocked"
      );
    }

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { blockedById: null },
    });

    await emitConversation("conversation:updated", updated);

    const items = await buildItems([updated], me);
    res.json({ success: true, data: items[0] });
  })
);

// ---------------------------------------------------------------------------
// GET /api/conversations/:id/messages
// ---------------------------------------------------------------------------
conversationsRouter.get(
  "/:id/messages",
  asyncHandler(async (req, res) => {
    const me = meOf(req);
    const conversation = await loadConversation(req.params.id);

    if (!conversation.participantIds.includes(me)) {
      throw notFound("Conversation not found");
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
    });

    // Anything the other person sent and I haven't opened yet is now read.
    // (Updated by id: Prisma's `readAt: null / { equals: null }` filters do
    // not match documents where MongoDB never stored the field.)
    const now = new Date();
    const unread = messages.filter(
      (m) => m.senderId !== me && m.readAt === null
    );
    await Promise.all(
      unread.map((m) =>
        prisma.message.update({
          where: { id: m.id },
          data: { readAt: now },
        })
      )
    );

    // Unread badges clear live on both ends…
    await emitConversation("conversation:updated", conversation);
    // …and the sender's own bubbles flip to ✓✓ the moment I open the thread.
    const otherId = conversation.participantIds.find((id: string) => id !== me);
    if (unread.length && otherId) {
      emitToUser(otherId, "message:read", {
        conversationId: conversation.id,
        readerId: me,
        readAt: now,
        messageIds: unread.map((m) => m.id),
      });
    }

    const read = messages.map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      text: message.text,
      attachments: (message.attachments as any[]) ?? [],
      readAt: message.senderId !== me && message.readAt === null ? now : message.readAt,
      createdAt: message.createdAt,
    }));

    res.json({ success: true, data: read.map(mapDoc) });
  })
);

// ---------------------------------------------------------------------------
// POST /api/conversations/:id/messages/create       { text, attachments? }
// ---------------------------------------------------------------------------
conversationsRouter.post(
  "/:id/messages/create",
  asyncHandler(async (req, res) => {
    const me = meOf(req);
    const conversation = await loadConversation(req.params.id);

    if (!conversation.participantIds.includes(me)) {
      throw notFound("Conversation not found");
    }
    if (conversation.status !== "accepted") {
      throw forbidden("Accept the message request before chatting");
    }
    if (conversation.blockedById) {
      throw forbidden(
        conversation.blockedById === me
          ? "You blocked this user — unblock them to send messages"
          : "You can't send messages to this user"
      );
    }

    const text = readText(req.body?.text);
    const attachments = readAttachments(req.body?.attachments);
    if (!text && !attachments.length) {
      throw badRequest("Message text or attachment is required");
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: me,
        text,
        ...(attachments.length
          ? { attachments: JSON.parse(JSON.stringify(attachments)) as any }
          : {}),
      },
    });

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    emitToUsers(conversation.participantIds, "message:new", mapDoc(message));
    await emitConversation("conversation:updated", updated);

    res.json({ success: true, data: mapDoc(message) });
  })
);

export default conversationsRouter;