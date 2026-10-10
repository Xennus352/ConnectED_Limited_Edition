import React, { useEffect, useRef, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";

import useAxiosInstance from "@/api";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { StudentOption } from "./types";

interface StudentPickerProps {
  value: StudentOption | null;
  onChange: (student: StudentOption | null) => void;
  placeholder: string;
  noResultsLabel: string;
  disabled?: boolean;
}

const initials = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * Autocomplete over the platform's existing students. Typing queries
 * `GET /students?search=` (debounced) and picking a row maps it to a
 * `studentId`, which is what the assignment endpoints expect.
 */
const StudentPicker: React.FC<StudentPickerProps> = ({
  value,
  onChange,
  placeholder,
  noResultsLabel,
  disabled,
}) => {
  const $axios = useAxiosInstance();
  // Keep the latest instance in a ref so the fetch effect doesn't re-run on
  // every render (the hook returns a new instance each time).
  const axiosRef = useRef($axios);
  useEffect(() => {
    axiosRef.current = $axios;
  }, [$axios]);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<StudentOption[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;

    let active = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await axiosRef.current.get("/students", {
          params: { search: query, limit: 8 },
        });
        if (!active) return;

        const rows = response.data?.data ?? [];
        setOptions(
          rows.map((student: any) => ({
            id: student._id ?? student.id,
            fullName: student.fullName,
            profilePhoto: student.profilePhoto ?? null,
            className: student.class?.name ?? null,
          }))
        );
      } catch {
        if (active) setOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query]);

  const inputValue = open ? query : value?.fullName ?? "";

  return (
    <div ref={containerRef} className='relative'>
      <div className='relative'>
        <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          className='pl-9 pr-9'
          placeholder={placeholder}
          value={inputValue}
          disabled={disabled}
          role='combobox'
          aria-expanded={open}
          autoComplete='off'
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (value) onChange(null);
          }}
        />
        {value ? (
          <button
            type='button'
            aria-label='Clear'
            className='absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
          >
            <X className='h-3.5 w-3.5' />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className='absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md'>
          {loading ? (
            <div className='flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin' />
            </div>
          ) : options.length === 0 ? (
            <p className='px-3 py-2 text-sm text-muted-foreground'>
              {noResultsLabel}
            </p>
          ) : (
            options.map((student) => {
              const selected = student.id === value?.id;
              return (
                <button
                  key={student.id}
                  type='button'
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    selected && "bg-accent/60"
                  )}
                  onClick={() => {
                    onChange(student);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  {student.profilePhoto ? (
                    <img
                      src={student.profilePhoto}
                      alt={student.fullName}
                      className='h-6 w-6 rounded-full object-cover'
                    />
                  ) : (
                    <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary'>
                      {initials(student.fullName)}
                    </span>
                  )}
                  <span className='min-w-0 flex-1 truncate'>
                    {student.fullName}
                    {student.className ? (
                      <span className='ml-2 text-xs text-muted-foreground'>
                        {student.className}
                      </span>
                    ) : null}
                  </span>
                  {selected ? <Check className='h-3.5 w-3.5 text-primary' /> : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
};

export default StudentPicker;
