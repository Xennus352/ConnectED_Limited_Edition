import React from "react";

import DatePickerWithRange from "@/components/ui/data-table/date-picker-with-range";
import FleetDataTable from "@/components/views/list/shared/fleet-data-table";
import { TRIP_STATUS_OPTIONS } from "@/constants/transport";
import { ITrip } from "@/interfaces/transport";

const TripsDataTable: React.FC<{
  columns: any;
  data: any;
  loading?: boolean;
}> = ({ columns, data, loading }) => (
  <FleetDataTable<ITrip>
    entity='trip'
    columns={columns}
    data={data}
    loading={loading}
    statusOptions={TRIP_STATUS_OPTIONS}
    filters={<DatePickerWithRange loading={loading} />}
  />
);

export default TripsDataTable;