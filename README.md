# ConnectED

School management CRM — a React client backed by an Express API and MongoDB.

```
connect-ed/
├─ client/    React + Vite + Redux + React Query UI  → http://localhost:5173
├─ server/    Express + TypeScript + Prisma API      → http://localhost:8000/api
├─ docker-compose.yml   MongoDB 7 (port 27017)
├─ package.json          workspace scripts
└─ pnpm-workspace.yaml   pnpm workspace (client + server)
```

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io) 10+
- Docker (for MongoDB)

## Quick start

```bash
pnpm install        # installs client + server in one workspace
pnpm db:up          # start MongoDB (docker compose up -d)
pnpm db:setup       # prisma generate + db push + seed demo data
pnpm dev            # client on :5173 and API on :8000, at the same time
```

Open <http://localhost:5173> and sign in with one of the seeded accounts:

| Role       | Username     | Password     |
| ---------- | ------------ | ------------ |
| Super admin| `superadmin` | `Admin@123`  |
| Admin      | `admin`      | `Admin@123`  |
| Teacher    | `teacher`    | `Teacher@123`|
| Student    | `student`    | `Student@123`|
| Parent     | `parent`     | `Parent@123` |

Seed data: 2 admins, 6 teachers, 24 students, 6 parents, 6 classes, 8 subjects,
5 rooms, 30 lessons, 10 exams, 10 assignments, 48 results, 60 attendance rows,
6 announcements and 5 events — every relation is populated so no table renders
an empty cell.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run client and server together (parallel) |
| `pnpm dev:client` | Vite dev server only (`:5173`) |
| `pnpm dev:server` | Express API only (`:8000`, hot reload) |
| `pnpm build` | Type-check and build both packages |
| `pnpm db:up` / `pnpm db:down` | Start / stop the MongoDB container |
| `pnpm db:setup` | Generate Prisma client, push schema, seed (first run) |
| `pnpm db:reset` | Drop every collection and seed from scratch |
| `pnpm db:studio` | Prisma Studio (browse the data) |

## Configuration

| File | Purpose |
| --- | --- |
| `server/.env` | Port, `DATABASE_URL`, `JWT_SECRET`, allowed CORS origins |
| `server/.env.example` | Same keys, safe to commit |
| `client/.env` | `VITE_API_BASE_URL=http://localhost:8000/api` |

The client only talks to the API through `VITE_API_BASE_URL`, so moving the
server to another host or port means updating that value **and**
`CLIENT_ORIGINS` in `server/.env`.

## How the client talks to the API

Every response uses the same envelope:

```jsonc
// list
{ "success": true, "data": [ ... ], "meta": { "total": 6, "skip": 0, "limit": 10, "page": 1 } }
// single
{ "success": true, "data": { "_id": "...", ... } }
// error
{ "success": false, "message": "..." }
```

- Documents expose `_id` (not Prisma's `id`), and `password` is never returned.
- `GET /api/<resource>` without `limit`/`page` returns **every** row — that is
  what the client's selector widgets expect.
- Auth is `Authorization: Bearer <token>`; only `GET /api/health` and
  `POST /api/auth/sign-in` are public.

See [`server/README.md`](server/README.md) for the full endpoint list.

## Troubleshooting

**Port 27017 is already in use.**
Something else (e.g. a container named `connected-mongo`) may already publish
MongoDB on 27017, which stops `connect-ed-mongodb` from starting. Pick one:

```bash
docker stop connected-mongo && pnpm db:up   # use this project's container
# or
docker ps                                    # keep it and skip `pnpm db:up`
```

If you switch containers, the data lives with the container, so re-run
`pnpm db:setup` to reseed.

**Port 8000 or 5173 is already in use.** Stop the other process, or change
`PORT` in `server/.env` together with `client/.env`.

**Changed `prisma/schema.prisma`.** Run `pnpm --filter ./server db:push`.

**Weird data after an experiment.** `pnpm db:reset` wipes and reseeds
everything (it is guarded — the plain `db:seed` refuses to overwrite existing
data unless you pass `--force`).

## Notes on the storage model

MongoDB has no implicit relations, so a few things are stored as plain id
lists and expanded to documents when read:

- `Teacher.subjectIds` → `subjects`, `Teacher.assignedClassIds` → `assignedClasses`
- `Announcement`/`Event` authors are stored as `createdById` + `creatededByModel`
  (`admin` or `teacher`) and resolved to `createdBy` on read
- Lesson/exam times submitted as `HH:MM` from `input[type=time]` are converted
  to today's date so the client's date columns never render `Invalid Date`
