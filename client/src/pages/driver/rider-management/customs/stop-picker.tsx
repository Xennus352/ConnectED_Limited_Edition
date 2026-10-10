import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, MapPin, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { StopOption } from "./types";

interface StopPickerProps {
  stops: StopOption[];
  value: string | null;
  onChange: (stopId: string | null) => void;
  placeholder: string;
  noResultsLabel: string;
  /** Fired when the field is focused — used to aim map clicks at this field. */
  onFocusField?: () => void;
}

const accentClass = (accent?: "pickup" | "dropoff"): string =>
  accent === "pickup"
    ? "text-emerald-600"
    : accent === "dropoff"
      ? "text-amber-600"
      : "text-muted-foreground";

/**
 * Type-to-search picker for the stops on the driver's route. The list is the
 * same geometry the map draws, so each row also shows the stop's coordinates.
 */
const StopPicker: React.FC<StopPickerProps & { accent?: "pickup" | "dropoff" }> = ({
  stops,
  value,
  onChange,
  placeholder,
  noResultsLabel,
  accent,
  onFocusField,
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
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

  const selected = stops.find((stop) => stop.id === value) ?? null;

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return stops;
    return stops.filter((stop) => stop.name.toLowerCase().includes(needle));
  }, [stops, query]);

  return (
    <div ref={containerRef} className='relative'>
      <div className='relative'>
        <Search
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
            accentClass(accent)
          )}
        />
        <Input
          className='pl-9 pr-9'
          placeholder={placeholder}
          value={open ? query : selected?.name ?? ""}
          role='combobox'
          aria-expanded={open}
          autoComplete='off'
          onFocus={() => {
            setOpen(true);
            setQuery("");
            onFocusField?.();
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (value) onChange(null);
          }}
        />
        {selected ? (
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
          {matches.length === 0 ? (
            <p className='px-3 py-2 text-sm text-muted-foreground'>
              {noResultsLabel}
            </p>
          ) : (
            matches.map((stop) => {
              const isSelected = stop.id === value;
              return (
                <button
                  key={stop.id}
                  type='button'
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent/60"
                  )}
                  onClick={() => {
                    onChange(stop.id);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <MapPin className='h-4 w-4 shrink-0 text-muted-foreground' />
                  <span className='min-w-0 flex-1 truncate'>{stop.name}</span>
                  {Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude) ? (
                    <span className='shrink-0 font-mono text-[10px] text-muted-foreground'>
                      {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                    </span>
                  ) : null}
                  {isSelected ? <Check className='h-3.5 w-3.5 text-primary' /> : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
};

export default StopPicker;
