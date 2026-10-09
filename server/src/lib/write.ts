import { Request, RequestHandler, Response } from "express";
import { badRequest } from "./errors";
import { isObjectId, toDate } from "./query";

/**
 * Turns a request body into a Prisma `data` payload.
 *
 * The forms send relation ids as plain strings ("class: '<id>'"), but they can
 * also echo back a populated object when they were pre-filled from a list
 * response ("class: { _id, name }"). Both shapes are accepted here so the API
 * never has to care how the client stored the value.
 */
export interface WriteOptions {
  /** Single relation: query name -> scalar field on the model. */
  relations?: Record<string, string>;
  /** Many relations: name -> how Prisma should apply the ids. */
  manyRelations?: Record<string, "set" | "connect">;
  /** Fields that must be converted to a Date. */
  dates?: string[];
  /** Fields that are passed through untouched (String[] such as `videos`). */
  lists?: string[];
  /** Fields that are never writable. */
  ignore?: string[];
}

export const idOf = (value: unknown): string | null => {
  if (isObjectId(value)) return value;

  if (value && typeof value === "object") {
    const candidate = (value as Record<string, any>)._id ?? (value as Record<string, any>).id;
    return isObjectId(candidate) ? candidate : null;
  }

  return null;
};

export const buildData = (
  body: Record<string, any>,
  options: WriteOptions = {},
  mode: "create" | "update" = "create"
): Record<string, any> => {
  const {
    relations = {},
    manyRelations = {},
    dates = [],
    lists = [],
    ignore = ["_id", "id", "createdAt", "updatedAt", "__v"],
  } = options;

  const data: Record<string, any> = {};

  for (const [key, value] of Object.entries(body ?? {})) {
    if (value === undefined) continue;
    if (ignore.includes(key)) continue;

    // --- single relations -------------------------------------------------
    const relationField = relations[key];
    if (relationField) {
      if (value === null || value === "") continue;

      const id = idOf(value);
      if (!id) {
        if (mode === "create") {
          throw badRequest(`"${key}" does not reference a valid record`);
        }
        // Edit forms often re-submit the placeholder they failed to pre-fill;
        // ignoring it keeps the stored value untouched instead of failing.
        continue;
      }

      data[relationField] = id;
      continue;
    }

    // --- many relations ---------------------------------------------------
    const manyMode = manyRelations[key];
    if (manyMode) {
      const rawItems = Array.isArray(value) ? value : value ? [value] : [];
      const ids = rawItems
        .map(idOf)
        .filter((id): id is string => Boolean(id));

      const invalid = rawItems.some(
        (item) => item !== null && item !== "" && !idOf(item)
      );
      if (invalid && mode === "create") {
        throw badRequest(`"${key}" contains an invalid reference`);
      }

      data[key] =
        manyMode === "set"
          ? { set: ids.map((id) => ({ id })) }
          : { connect: ids.map((id) => ({ id })) };
      continue;
    }

    // --- dates ------------------------------------------------------------
    if (dates.includes(key)) {
      const date = toDate(value);
      if (date) data[key] = date;
      continue;
    }

    // --- scalar lists -----------------------------------------------------
    if (lists.includes(key)) {
      if (Array.isArray(value)) data[key] = value.map(String);
      continue;
    }

    if (value === "") {
      if (mode === "update") continue;
      data[key] = value;
      continue;
    }

    data[key] = value;
  }

  return data;
};

export default buildData;
