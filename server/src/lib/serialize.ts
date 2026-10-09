/**
 * The client (react + TypeScript) works with Mongo style documents: every
 * record is addressed by `_id`, while Prisma exposes the field as `id`.
 * Everything that leaves the API goes through `mapDoc` so the two worlds line
 * up without any client side changes.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !(value instanceof Date) &&
  !(value instanceof RegExp) &&
  !Array.isArray(value) &&
  !(typeof Buffer !== "undefined" && value instanceof Buffer);

export function mapDoc<T = any>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => mapDoc(item)) as unknown as T;
  }

  if (isPlainObject(value)) {
    const output: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(value)) {
      output[key === "id" ? "_id" : key] = mapDoc(nested);
    }

    return output as unknown as T;
  }

  return value;
}

/** Removes secrets (password hashes) from a payload on its way out. */
export function stripSecrets<T = any>(doc: T): T {
  if (!doc || typeof doc !== "object") return doc;

  const { password: _password, ...rest } = doc as Record<string, any>;
  return rest as unknown as T;
}

export default mapDoc;
