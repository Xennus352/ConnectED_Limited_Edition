import { TRole } from "./user";

/** A user as surfaced by the directory / conversation participants. */
export interface IUserRef {
  _id: string;
  fullName: string;
  username?: string;
  profilePhoto?: string;
  role: TRole;
  model?: string;
}

export type TConversationStatus = "pending" | "accepted";

/** A file attached to a message (uploaded via POST /api/upload/file). */
export interface IAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface IMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  text: string;
  attachments?: IAttachment[];
  readAt: string | null;
  createdAt: string;
}

export interface IConversation {
  _id: string;
  status: TConversationStatus;
  requestedById: string;
  /** Set when one participant blocked the other — holds the blocker's id. */
  blockedById?: string | null;
  participants: IUserRef[];
  lastMessage: {
    text: string;
    createdAt: string;
    senderId: string;
    attachments?: IAttachment[];
  } | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

/** User entry from `GET /api/users/directory` / banned list. */
export interface IDirectoryUser extends IUserRef {
  username: string;
  model: string;
}
