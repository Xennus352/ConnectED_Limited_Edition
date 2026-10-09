/**
 * The bus list that sits beside the map: search, one row per vehicle and a
 * click-to-select interaction that also centres and opens the marker.
 */
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BusFront, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ageOf, formatAge, formatSpeed } from "../freshness";
import type { FleetBus } from "../types";
import { FreshnessBadge, StatusBadge } from "./StatusBadges";

interface BusListProps {
  buses: FleetBus[];
  selectedBusId: string | null;
  followBusId: string | null;
  clockOffset: number;
  onSelect: (busId: string) => void;
  onFollow: (busId: string) => void;
}

const matches = (bus: FleetBus, query: string): boolean => {
  if (!query) return true;
  const haystack = [
    bus.busNumber,
    bus.name,
    bus.registrationNumber,
    bus.route?.name ?? "",
    bus.route?.startLocation ?? "",
    bus.route?.endLocation ?? "",
    bus.driver?.fullName ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
};

const BusList: React.FC<BusListProps> = ({
  buses,
  selectedBusId,
  followBusId,
  clockOffset,
  onSelect,
  onFollow,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => buses.filter((bus) => matches(bus, query.trim().toLowerCase())),
    [buses, query]
  );

  return (
    <div className='flex h-full min-h-0 flex-col gap-3'>
      <div className='relative shrink-0'>
        <Search
          className='pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
          aria-hidden='true'
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("fleet.panel.search")}
          aria-label={t("fleet.panel.search")}
          className='pl-8'
        />
      </div>

      <div className='min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5'>
        {filtered.length === 0 ? (
          <p className='rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground'>
            {buses.length === 0 ? t("fleet.empty.no_buses") : t("fleet.empty.no_matches")}
          </p>
        ) : null}

        {filtered.map((bus) => {
          const selected = bus.id === selectedBusId;
          const following = bus.id === followBusId;
          const age = formatAge(ageOf(bus.lastLocationAt, clockOffset));

          return (
            <div
              key={bus.id}
              role='button'
              tabIndex={0}
              onClick={() => onSelect(bus.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(bus.id);
                }
              }}
              className={`cursor-pointer rounded-lg border p-2.5 transition-colors ${
                selected
                  ? "border-primary/60 bg-primary/5"
                  : "bg-card hover:border-primary/40 hover:bg-muted/40"
              }`}
              aria-pressed={selected}
            >
              <div className='flex items-start gap-2.5'>
                <span
                  className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-md ${
                    selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <BusFront className='size-4' aria-hidden='true' />
                </span>

                <div className='min-w-0 flex-1'>
                  <div className='flex items-center justify-between gap-2'>
                    <p className='truncate text-sm font-semibold'>{bus.busNumber}</p>
                    <StatusBadge status={bus.status} />
                  </div>

                  <p className='truncate text-xs text-muted-foreground'>
                    {bus.route?.name ?? t("fleet.panel.no_route")}
                    {bus.driver?.fullName ? ` · ${bus.driver.fullName}` : ""}
                  </p>

                  <div className='mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1'>
                    <FreshnessBadge bus={bus} clockOffset={clockOffset} />
                    <span className='text-[11px] text-muted-foreground'>
                      {bus.latitude !== null ? formatSpeed(bus.speed) : age}
                    </span>
                  </div>

                  <div className='mt-1.5 flex items-center justify-between gap-2'>
                    <span className='truncate text-[11px] text-muted-foreground'>
                      {t("fleet.panel.riders", { count: bus.studentCount })}
                    </span>
                    <button
                      type='button'
                      onClick={(event) => {
                        event.stopPropagation();
                        onFollow(bus.id);
                      }}
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        following
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      {following
                        ? t("fleet.action.resume_following")
                        : t("fleet.action.follow")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(BusList);
