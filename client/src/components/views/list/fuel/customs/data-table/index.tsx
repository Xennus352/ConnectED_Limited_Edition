import React from "react";

import DatePickerWithRange from "@/components/ui/data-table/date-picker-with-range";
import FleetDataTable from "@/components/views/list/shared/fleet-data-table";
import { IFuelRecord } from "@/interfaces/transport";

const FuelDataTable: React.FC<{
  columns: any;
  data: any;
  loading?: boolean;
}> = ({ columns, data, loading }) => (
  <FleetDataTable<IFuelRecord>
    entity='fuel'
    columns={columns}
    data={data}
    loading={loading}
    filters={<DatePickerWithRange loading={loading} />}
  />
);

export default FuelDataTable;