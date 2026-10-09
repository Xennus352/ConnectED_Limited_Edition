import React from "react";
import { useField } from "formik";
import classNames from "classnames";
import { CalendarIcon } from "lucide-react";

import Loading from "./loading";
import { cn } from "@/lib/utils";
import { TimePicker } from "./time-picker";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PropsI {
  label: string;
  name: string;
  loading?: boolean;
}

const DateTimePickerField: React.FC<PropsI> = (props) => {
  const [field, meta, helpers] = useField(props);
  const { loading } = props;

  return (
    <div>
      <Label
        htmlFor={field.name}
        className={classNames("text-base font-normal", {
          "text-error": meta.touched && meta.error,
        })}
      >
        {props.label}
      </Label>
      {loading ? (
        <Loading />
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                "focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-primary-500",
                "dark:focus-visible:ring-primary-400",
              )}
            >
              <CalendarIcon className='mr-2 h-4 w-4' />
              <span>{props.label}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <TimePicker
              date={field.value as Date | undefined}
              setDate={helpers.setValue}
            />
          </PopoverContent>
        </Popover>
      )}

      {meta.touched && meta.error ? (
        <span className='error'>{meta.error}</span>
      ) : null}
    </div>
  );
};

export default DateTimePickerField;
