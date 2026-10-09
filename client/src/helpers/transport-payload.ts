/** Convert a form value into what the transport API accepts. */

export const nullableString = (value: unknown): string | null =>
  value === "" || value === undefined ? null : String(value);

export const nullableNumber = (value: unknown): number | null => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const numberOr = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && String(value) !== "" ? parsed : fallback;
};

export const nullableDate = (value: unknown): string | null =>
  value === "" || value === null || value === undefined ? null : String(value);