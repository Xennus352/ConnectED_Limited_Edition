import { format } from "date-fns";

/**
 * Render any birthday value (ISO timestamp, date-only string or Date) as
 * `YYYY-MM-DD`, matching the format used by the date form fields.
 *
 * When the value already carries a date-only prefix (`YYYY-MM-DD...`) it is
 * used verbatim so timezone shifts never nudge the displayed day. Empty or
 * invalid values return an empty string so callers can render their fallback.
 */
export const formatBirthday = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value);
  const dateOnly = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (dateOnly) return dateOnly[0];
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd");
};