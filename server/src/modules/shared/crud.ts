import { Request, Router } from "express";

import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { badRequest, forbidden, notFound } from "../../lib/errors";
import { buildWhere, isObjectId, readPagination } from "../../lib/query";
import type { RelationFilter } from "../../lib/query";
import { mapDoc, stripSecrets } from "../../lib/serialize";
import { WriteOptions, buildData } from "../../lib/write";

export interface CrudOptions {
  /** Prisma client delegate, e.g. "student" or "class". */
  delegate: string;
  /** Relations expanded before the response is sent. */
  include?: Record<string, any>;
  /** Fields scanned by `?search=`. */
  searchable?: string[];
  /** query parameter -> scalar relation field, e.g. { class: "classId" }. */
  relationFilters?: Record<string, RelationFilter>;
  /** request body key -> scalar relation field, e.g. { teacher: "teacherId" }. */
  relationInputs?: Record<string, string>;
  /** Many relations: name -> Prisma operation. */
  manyRelations?: Record<string, "set" | "connect">;
  /** Whether the model exposes a `status`. */
  statusField?: boolean;
  /** Column driven by startDate / dueDate / date. */
  dateField?: string;
  /** Extra query parameters -> scalar fields. */
  extraFilters?: Record<string, string>;
  /** Routes such as GET /lessons/class/:classId. */
  relatedRoutes?: Array<{ path: string; param: string; field: string }>;
  /** Last chance to extend the where clause for resource specific params. */
  postWhere?: (
    where: Record<string, any>,
    query: Record<string, any>
  ) => void;
  dates?: string[];
  lists?: string[];
  orderBy?: Record<string, "asc" | "desc">;
  /** Skip create / update / delete (attendances, rooms, ...). */
  readOnly?: boolean;
  /** Extra routes registered before `GET /:id`. */
  extraRoutes?: (router: Router) => void;
  /** Hook run before a create/update payload is persisted. */
  beforeWrite?: (
    data: Record<string, any>,
    mode: "create" | "update",
    req: Request
  ) => Record<string, any> | Promise<Record<string, any>>;
  /** Hook used to resolve polymorphic fields after the read. */
  resolve?: (doc: any) => Promise<any> | any;
  /** Remove password hashes from the payload. */
  stripSecrets?: boolean;
  /** Authorization policy: the UI may hide buttons, but the server decides. */
  authz?: CrudAuthz;
}

/**
 * Server-side authorization for a CRUD resource. Roles decide *whether* and
 * the two scope hooks decide *which records*. Both are enforced here in the
 * shared layer so no route can accidentally ship without a policy.
 */
export interface CrudAuthz {
  /** Roles allowed to list/get the resource. Default: any authenticated user. */
  readRoles?: readonly string[];
  /** Roles allowed to create/update/delete. Default: any authenticated user. */
  writeRoles?: readonly string[];
  /**
   * Restricts list reads by mutating the `where` clause. Throwing rejects the
   * whole request; mutating `where` narrows the result set server-side.
   */
  readScope?: (
    req: Request,
    where: Record<string, any>
  ) => Promise<void> | void;
  /** Validates a single resource after it has been loaded for a GET /:id. */
  readOneScope?: (req: Request, doc: Record<string, any>) => Promise<void> | void;
  /**
   * Validates a write. `target` is the parsed payload on create, and the
   * existing record on update/delete. `payload` carries the parsed request
   * body on create/update so a scope can compare "who owns it" against
   * "what the client tried to change". Throw to reject.
   */
  writeScope?: (
    req: Request,
    mode: "create" | "update" | "delete",
    target: Record<string, any>,
    payload?: Record<string, any>
  ) => Promise<void> | void;
}

export const crudRouter = (options: CrudOptions): Router => {
  const router = Router();

  const {
    delegate,
    include,
    searchable = [],
    relationFilters = {},
    relationInputs = {},
    manyRelations = {},
    statusField = false,
    dateField,
    extraFilters = {},
    relatedRoutes = [],
    postWhere,
    dates = [],
    lists = [],
    orderBy = { createdAt: "desc" },
    readOnly = false,
    beforeWrite,
    resolve,
    stripSecrets: shouldStrip = false,
    authz,
  } = options;

  const model: any = (prisma as any)[delegate];
  if (!model) {
    throw new Error(`Unknown Prisma delegate "${delegate}"`);
  }

  const writeOptions: WriteOptions = {
    relations: relationInputs,
    manyRelations,
    dates,
    lists,
    ignore: ["_id", "id", "createdAt", "updatedAt", "__v"],
  };

  const present = async (doc: any) => {
    const output = shouldStrip ? stripSecrets(doc) : doc;
    const shaped = mapDoc(output);
    return resolve ? await resolve(shaped) : shaped;
  };

  /** GET / */
  const list = asyncHandler(async (req, res) => {
    const where = buildWhere({
      query: req.query as Record<string, any>,
      searchable,
      relationFilters,
      statusField,
      dateField,
      extra: extraFilters,
    });

    // A teacher only sees their own lessons on the timetable widgets.
    if (delegate === "lesson" && req.query.user) {
      const user = req.query.user as Record<string, any>;
      if (user?.role === "teacher" && isObjectId(user?._id)) {
        where.teacherId = user._id;
      }
    }

    assertRoleIf(req, authz?.readRoles);
    if (authz?.readScope) await authz.readScope(req, where);

    postWhere?.(where, req.query as Record<string, any>);

    const { paginate, limit, skip, page } = readPagination(
      req.query as Record<string, any>
    );

    const [rows, total] = await Promise.all([
      model.findMany({
        where,
        include,
        orderBy,
        ...(paginate ? { take: limit, skip } : {}),
      }),
      model.count({ where }),
    ]);

    const data = await Promise.all(rows.map(present));

    res.json({
      success: true,
      data,
      meta: {
        total,
        skip: paginate ? skip : 0,
        limit: paginate ? limit : data.length,
        page,
      },
    });
  });

  /** GET /:id */
  const getOne = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isObjectId(id)) throw notFound("Resource not found");

    assertRoleIf(req, authz?.readRoles);

    const doc = await model.findUnique({ where: { id }, include });
    if (!doc) throw notFound("Resource not found");

    if (authz?.readOneScope) await authz.readOneScope(req, doc);

    res.json({ success: true, data: await present(doc) });
  });

  /** POST /create */
  const create = asyncHandler(async (req, res) => {
    assertRoleIf(req, authz?.writeRoles);

    let data = buildData(req.body, writeOptions, "create");
    if (authz?.writeScope) await authz.writeScope(req, "create", data, data);
    if (beforeWrite) data = await beforeWrite(data, "create", req);

    const doc = await model.create({ data, include });
    res.json({ success: true, data: await present(doc) });
  });

  /** PUT /:id */
  const update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isObjectId(id)) throw notFound("Resource not found");

    assertRoleIf(req, authz?.writeRoles);

    const existing = await model.findUnique({ where: { id }, include });
    if (!existing) throw notFound("Resource not found");

    let data = buildData(req.body, writeOptions, "update");
    if (authz?.writeScope)
      await authz.writeScope(req, "update", existing, data);
    if (beforeWrite) data = await beforeWrite(data, "update", req);

    if (!Object.keys(data).length) {
      res.json({ success: true, data: await present(existing) });
      return;
    }

    const doc = await model.update({ where: { id }, data, include });
    res.json({ success: true, data: await present(doc) });
  });

  /** DELETE /:id */
  const remove = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isObjectId(id)) throw notFound("Resource not found");

    assertRoleIf(req, authz?.writeRoles);

    const existing = await model.findUnique({ where: { id } });
    if (!existing) throw notFound("Resource not found");

    if (authz?.writeScope) await authz.writeScope(req, "delete", existing);

    const doc = await model.delete({ where: { id } });
    res.json({ success: true, data: await present(doc) });
  });

  const readOnlyGuard = asyncHandler(async () => {
    throw badRequest("This resource is read-only");
  });

  const assertRoleIf = (req: Request, roles?: readonly string[]) => {
    if (!roles?.length) return;
    const role = req.user?.role?.toLowerCase?.();
    if (!role || !roles.includes(role)) {
      throw forbidden("You do not have permission to perform this action");
    }
  };

  for (const related of relatedRoutes) {
    router.get(
      related.path,
      asyncHandler(async (req, res) => {
        assertRoleIf(req, authz?.readRoles);

        const value = req.params[related.param];
        const where: Record<string, any> = isObjectId(value)
          ? { [related.field]: value }
          : { [related.field]: { in: [] } };

        if (authz?.readScope) await authz.readScope(req, where);

        postWhere?.(where, req.query as Record<string, any>);

        const rows = await model.findMany({ where, include, orderBy });
        const data = await Promise.all(rows.map(present));

        res.json({
          success: true,
          data,
          meta: { total: data.length, skip: 0, limit: data.length, page: 1 },
        });
      })
    );
  }

  options.extraRoutes?.(router);

  router.get("/", list);
  router.post("/create", readOnly ? readOnlyGuard : create);
  router.get("/:id", getOne);
  router.put("/:id", readOnly ? readOnlyGuard : update);
  router.delete("/:id", readOnly ? readOnlyGuard : remove);

  return router;
};

export default crudRouter;
