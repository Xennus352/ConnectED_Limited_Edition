# ConnectED API

Express + TypeScript + Prisma (MongoDB) server for the ConnectED client.

```
src/
├─ app.ts                 express app: cors, morgan, auth, routes, error handling
├─ server.ts              entry point (loads .env, http + Socket.IO, listens on PORT)
├─ sockets.ts             Socket.IO bootstrap: handshake auth, user rooms, emit helpers
├─ config/                env + Prisma client
├─ lib/                   query building, write transforms, serialization, jwt, cross-model users
├─ middlewares/           auth (Bearer JWT) + error handlers
└─ modules/
   ├─ shared/crud.ts      one factory that serves every resource's 5 routes
   ├─ auth/               sign-in, me
   ├─ users/              admins, teachers, students, parents + bans + directory
   ├─ chat/               conversations, messages
   ├─ academic/           classes, rooms, subjects, lessons, exams, assignments
   ├─ records/            results, attendances, announcements, events
   ├─ analytics/          GET /analytics
   └─ upload/             POST /upload/image
```

## Running it

```bash
pnpm dev          # tsx watch — restarts on every change
pnpm typecheck    # tsc --noEmit
pnpm build        # compile to dist/  →  pnpm start
```

The API expects MongoDB to be reachable through `DATABASE_URL` (see `.env`).
From the workspace root: `pnpm db:up` then `pnpm db:setup`.

| Script | What it does |
| --- | --- |
| `pnpm setup` | `prisma generate` + `db push` + seed (`--force`) |
| `pnpm db:push` | Push the schema without dropping data |
| `pnpm db:reset` | `db push --force-reset` + fresh seed |
| `pnpm db:seed` | Seed only (refuses to overwrite unless `--force`) |
| `pnpm db:studio` | Prisma Studio |

## Endpoints

All routes are mounted under `/api`. Everything except `GET /api/health` and
`POST /api/auth/sign-in` requires `Authorization: Bearer <token>`.

### Auth

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/sign-in` | `{ username, password }` → `{ token, user }` |
| GET | `/auth/me` | The signed-in user (no password) |
| GET | `/health` | `{ name: "ConnectED", status, time }` |

Banned accounts:

- `POST /auth/sign-in` for a banned user → **403** `"Your account has been banned"`.
- `requireAuth` also checks the ban: a banned user's token → **401** `"Your account has been banned"`
  (401 on purpose, so the client's axios interceptor signs the session out).

### Bans & directory — `/api/users`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/users/banned` | Admin / super-admin only (403 otherwise). Every banned user across all four models. `data` items are full mapped docs + a `model` field (`"Admin"`, `"Teacher"`, `"Student"`, `"Parent"`) |
| PUT | `/users/:id/ban` | Admin / super-admin only. Resolves the id across all four models (404 when unknown). Sets `isBanned: true`, emits `user:banned` to the user's live sockets |
| PUT | `/users/:id/unban` | Same, sets `isBanned: false` |
| GET | `/users/directory?q=&limit=` | Any signed-in user. Up to 20 users across all models matching `q` in `fullName` / `username` (empty `q` → first 20), **excluding the caller**. Items: `{ _id, fullName, username, profilePhoto, role, model }` |

### Conversations & messages — `/api/conversations`

Chat is a request → accept flow: creating a conversation starts it `pending`
with the request text as the first message; only after the recipient accepts
(`status: "accepted"`) can either side send more messages.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/conversations` | My conversations, newest activity first. Items: `{ _id, status, requestedById, createdAt, updatedAt, participants, lastMessage, unreadCount }`; `participants` = `[{ _id, fullName, profilePhoto, role, model }]`, `lastMessage` = `{ text, createdAt, senderId }` or `null`, `unreadCount` is per-viewer |
| POST | `/conversations/create` | `{ toUserId, text }`. Unknown recipient / self / empty or >2000-char text → 400; an existing conversation with the pair (either status) → 409 `"You already have a conversation with this user"`. Creates the `pending` conversation + first message |
| PUT | `/conversations/:id/accept` | Recipient only (403 otherwise); already accepted → 409 |
| DELETE | `/conversations/:id` | Participant only (404 otherwise). Deletes the conversation + messages |
| GET | `/conversations/:id/messages` | Participant only (404 otherwise). Ascending by `createdAt`. Marks the other side's unread messages as read and pushes `conversation:updated` to both |
| POST | `/conversations/:id/messages/create` | `{ text }`. Participant only (404); conversation must be `accepted` (403 `"Accept the message request before chatting"`); text required, ≤2000 chars (400). Message items: `{ _id, conversationId, senderId, text, readAt, createdAt }` |

### Realtime (Socket.IO)

A Socket.IO server shares the same port 8000 as the REST API, and the client
connects with the same JWT:

```ts
import { io } from "socket.io-client";
const socket = io("http://localhost:8000", { auth: { token } });
```

- Handshake: the server verifies `auth.token`; an invalid token disconnects the socket.
- Every socket joins room `user:<userId>`; a user with several tabs holds several sockets.
- Server → client events (payloads):

| Event | Payload |
| --- | --- |
| `conversation:new` | A conversation item (same shape as `GET /conversations`, `unreadCount` computed for the receiving user) |
| `conversation:updated` | A conversation item, shaped for the receiving user (unread badges update live) |
| `conversation:removed` | `{ conversationId }` — sent to the *other* participant when someone deletes/declines/cancels |
| `message:new` | `{ _id, conversationId, senderId, text, readAt, createdAt }` |
| `user:banned` | `{ userId }` — sent to a user's sockets the moment an admin bans them (instant sign-out) |

### Resources

Each resource serves the same five routes:

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/<resource>` | List. `?limit`/`?page` paginate; **no `limit` returns everything** |
| POST | `/<resource>/create` | Create (200, body is the created document) |
| GET | `/<resource>/:id` | Single document (404 when missing) |
| PUT | `/<resource>/:id` | Partial update — only the keys you send are touched |
| DELETE | `/<resource>/:id` | Delete |

Resources: `admins`, `teachers`, `students`, `parents`, `classes`, `rooms`,
`subjects`, `lessons`, `exams`, `assignments`, `results`, `attendances`,
`announcements`, `events`.

Related routes (also used by the client):

| Method | Path |
| --- | --- |
| GET | `/lessons/class/:classId` |
| GET | `/lessons/teacher/:teacherId` |

Analytics and upload:

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/analytics?date=<iso>` | Dashboard counters and grouped series |
| POST | `/upload/image` | multipart field `image` → `{ imgUrl }` (served from `/uploads/…`) |

### Query parameters

| Param | Applies to | Behaviour |
| --- | --- | --- |
| `search` | all | Case-insensitive substring across the resource's searchable fields; multi-word queries are ANDed |
| `status` | models with a `status` | Exact match; `all`, `""` and `null` disable the filter |
| `class`, `lesson`, `student`, `subject` | varies | Relation filters (also accept `all`) |
| `type` | `results` | `exam` or `assignment` |
| `startDate` / `dueDate` / `date` | date-bearing models | Range / exact match on the date field |
| `limit`, `page` | all | `limit=10&page=2` → `meta { total, skip, limit, page }` |
| `user[_id]`, `user[role]` | `lessons` | Scopes the calendar to a teacher's own lessons |

### Response envelope

```jsonc
// list
{ "success": true, "data": [...], "meta": { "total": 6, "skip": 0, "limit": 10, "page": 1 } }
// single
{ "success": true, "data": { "_id": "...", ... } }
// error
{ "success": false, "message": "Resource not found" }
```

## Storage decisions worth knowing

MongoDB has no joins, so relations are stored as scalar id fields and
expanded into documents by `resolve` before the response is written:

- **`Teacher.subjectIds String[]`** → returned as `subjects`.
- **`Teacher.assignedClassIds String[]`** → returned as `assignedClasses`.
  This is deliberately *not* the `Class.teacher` back-relation: editing a
  teacher's assigned classes can never silently overwrite which teacher a
  class belongs to. Writes accept either plain ids or populated objects
  (`{ _id, ... }`) and drop anything that cannot be resolved.
- **`Announcement.createdById` + `createdByModel`** (`admin` | `teacher`) →
  returned as `createdBy`.
- **Conversation / Message** (`Conversation`, `Message`) model the chat.
  `Conversation.participantIds` holds exactly two ids that can belong to any of
  the four user models, so participants are resolved across the models on read
  (`server/src/lib/users.ts`) and returned as `participants`. Deleting a
  conversation removes its messages explicitly in the route.
- Bans are a plain `isBanned Boolean @default(false)` on all four user models.
- **`Student.classId`** → returned as a populated `class` object.
- Lesson `startTime`/`endTime` sent as `HH:MM` (an `input[type=time]` value)
  become today's date at that wall-clock time; full ISO strings keep their
  instant.
- Passwords are hashed with bcrypt on write and stripped from every response.
- Status/gender fields are plain strings, not Prisma enums, so the database
  never rejects a value the client invents.

## Environment

| Key | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8000` | Must match `client/.env` `VITE_API_BASE_URL` |
| `DATABASE_URL` | `mongodb://localhost:27017/connected` | Prisma MongoDB connection |
| `JWT_SECRET` | dev secret | HS256 signing key — change in production |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `CLIENT_ORIGINS` | `http://localhost:5173` | CORS allow-list, comma separated |

## Seed accounts

| Role | Username | Password |
| --- | --- | --- |
| Super admin | `superadmin` | `Admin@123` |
| Admin | `admin` | `Admin@123` |
| Teacher | `teacher` / `teacher1`…`teacher5` | `Teacher@123` |
| Student | `student` / `student1`…`student23` | `Student@123` |
| Parent | `parent` / `parent1`…`parent5` | `Parent@123` |
