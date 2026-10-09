import React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import classNames from "classnames";

import FleetDataTable from "@/components/views/list/shared/fleet-data-table";
import { BUS_STATUS_OPTIONS } from "@/constants/transport";
import { IBusFull } from "@/interfaces/transport";
import { Button } from "@/components/ui/button";
import { Archive } from "lucide-react";

/**
 * Buses table with a status filter and an "archived" toggle. Toggling
 * archived switches `?isActive=` so the server returns only archived or
 * active vehicles.
 */
const BusesDataTable: React.FC<{
  columns: any;
  data: any;
  loading?: boolean;
}> = ({ columns, data, loading }) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const showingArchived = searchParams.get("isActive") === "false";

  const toggleArchived = () => {
    const next = new URLSearchParams(searchParams);
    if (showingArchived) next.delete("isActive");
    else next.set("isActive", "false");
    setSearchParams(next);
  };

  return (
    <FleetDataTable<IBusFull>
      entity='bus'
      columns={columns}
      data={data}
      loading={loading}
      statusOptions={BUS_STATUS_OPTIONS}
      filters={
        <Button
          variant={showingArchived ? "default" : "outline"}
          size='sm'
          className={classNames("h-8 gap-1")}
          onClick={toggleArchived}
        >
          <Archive className='h-3.5 w-3.5' />
          {t(showingArchived ? "bus_form.show_active" : "bus_form.show_archived")}
        </Button>
      }
    />
  );
};

export default BusesDataTable;