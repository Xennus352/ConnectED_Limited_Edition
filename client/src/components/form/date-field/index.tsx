import React from "react";
import { useField } from "formik";
import classNames from "classnames";

import Loading from "./loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PropsI {
  label: string;
  name: string;
  loading?: boolean;
  placeholder?: string;
}

/** Normalize any date value (ISO string, Date or empty) to the `yyyy-MM-dd`
 * shape that `<input type="date">` understands, so the field never renders a
 * raw timestamp or a `null` value. */
const toDateInputValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value);
  // Already in the format expected by a date input.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const DateField: React.FC<PropsI> = (props) => {
  const [field, meta, helpers] = useField(props);
  const { loading, placeholder, label, ...inputProps } = props;

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    helpers.setValue(event.target.value);
  };

  return (
    <div>
      <Label
        htmlFor={field.name}
        className={classNames("text-base font-normal", {
          "text-error": meta.touched && meta.error,
        })}
      >
        {label}
      </Label>
      {loading ? (
        <Loading />
      ) : (
        <div className='relative'>
          <Input
            {...inputProps}
            type='date'
            id={field.name}
            name={field.name}
            value={toDateInputValue(field.value)}
            placeholder={placeholder}
            onBlur={field.onBlur}
            onChange={handleDateChange}
            className={classNames({
              "input-error focus-visible:ring-transparent placeholder:text-error":
                meta.touched && meta.error,
            })}
          />
        </div>
      )}
      {meta.touched && meta.error ? (
        <span className='error'>{meta.error}</span>
      ) : null}
    </div>
  );
};

export default DateField;