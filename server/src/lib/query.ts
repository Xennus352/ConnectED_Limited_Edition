const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const TIME_ONLY = /^(\d{1,2}):(\d{2})$/;

export const isObjectId = (value: unknown): value is string =>
  typeof value === "string" && OBJECT_ID.test(value);

/** Reads a query parameter and treats "", "all" and "null" as "no filter". */
export const readFilter = (
  query: Record<string, any>,
  key: string
): string | undefined => {
  const raw = query?.[key];
  if (typeof raw !== "string") return undefined;

  const value = raw.trim();
  if (!value || value === "all" || value === "null" || value === "undefined") {
    return undefined;
  }

  return value;
};

/**
 * Turns the loose values sent by the client into a `Date`.
 *
 * - "08:00" (input[type=time]) becomes today at 08:00 in the server timezone,
 *   so the client renders back the exact wall clock time the user picked.
 * - ISO strings (date pickers) keep the instant they were sent with, which is
 *   what the client would have displayed anyway.
 */
export const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const time = TIME_ONLY.exec(trimmed);
    if (time) {
      const now = new Date();
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        Number(time[1]),
        Number(time[2]),
        0,
        0
      );
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const isMidnight = (date: Date) =>
  date.getHours() === 0 &&
  date.getMinutes() === 0 &&
  date.getSeconds() === 0 &&
  date.getMilliseconds() === 0;

/** A relation filter: a scalar field, or a scalar list filtered with `has`. */
export type RelationFilter = string | { field: string; array?: boolean };

export interface WhereOptions {
  query: Record<string, any>;
  /** String fields scanned by the `search` parameter. */
  searchable?: string[];
  /** query parameter name -> Prisma scalar relation field, e.g. class -> classId */
  relationFilters?: Record<string, RelationFilter>;
  /** Whether the model exposes a `status` column. */
  statusField?: boolean;
  /** Column used by startDate / dueDate / date. */
  dateField?: string;
  /** Extra query parameters understood by this resource. */
  extra?: Record<string, string | undefined>;
}

/** Builds a Prisma `where` clause out of the client's query parameters. */
export const buildWhere = (options: WhereOptions): Record<string, any> => {
  const {
    query,
    searchable = [],
    relationFilters = {},
    statusField = false,
    dateField,
    extra = {},
  } = options;

  const where: Record<string, any> = {};

  for (const [queryKey, spec] of Object.entries(relationFilters)) {
    const value = readFilter(query, queryKey);
    if (!value) continue;

    const field = typeof spec === "string" ? spec : spec.field;
    const asList = typeof spec !== "string" && spec.array === true;

    // A malformed id would make Prisma throw, so return "nothing matches"
    // instead of failing the request.
    if (!isObjectId(value)) return { id: { in: [] } };
    where[field] = asList ? { has: value } : value;
  }

  if (statusField) {
    const status = readFilter(query, "status");
    if (status) where.status = status;
  }

  for (const [queryKey, field] of Object.entries(extra)) {
    const value = readFilter(query, queryKey);
    if (value !== undefined && field) {
      // Query parameters are always strings, but the underlying column may be
      // a boolean (e.g. isActive=false). Coerce known boolean literals so
      // Prisma receives the real type instead of failing the request.
      let coerced: string | boolean = value;
      if (value === "true") coerced = true;
      else if (value === "false") coerced = false;
      where[field] = coerced;
    }
  }

  const search = readFilter(query, "search");
  if (search && searchable.length) {
    where.OR = searchable.map((field) => ({
      [field]: { contains: search, mode: "insensitive" },
    }));
  }

  if (dateField) {
    const range: Record<string, Date> = {};

    const startDate = toDate(readFilter(query, "startDate"));
    const dueDate = toDate(readFilter(query, "dueDate"));
    const date = toDate(readFilter(query, "date"));

    if (startDate) range.gte = startOfDay(startDate);
    if (dueDate) range.lte = isMidnight(dueDate) ? endOfDay(dueDate) : dueDate;
    if (!startDate && !dueDate && date) {
      range.gte = startOfDay(date);
      range.lte = endOfDay(date);
    }

    if (Object.keys(range).length) where[dateField] = range;
  }

  return where;
};

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
  paginate: boolean;
}

/** Reads `page` / `limit`. When `limit` is absent the whole list is returned. */
export const readPagination = (query: Record<string, any>): Pagination => {
  const rawLimit = query?.limit;
  const rawPage = query?.page;

  const paginate = rawLimit !== undefined && rawLimit !== null && rawLimit !== "";

  const parsedLimit = Number(rawLimit);
  const limit =
    paginate && Number.isFinite(parsedLimit)
      ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 500)
      : 0;

  const parsedPage = Number(rawPage);
  const page =
    Number.isFinite(parsedPage) && parsedPage > 0 ? Math.trunc(parsedPage) : 1;

  return { page, limit, skip: paginate ? (page - 1) * limit : 0, paginate };
};
