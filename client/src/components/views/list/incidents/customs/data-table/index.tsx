import React from "react";

import DatePickerWithRange from "@/components/ui/data-table/date-picker-with-range";
import FleetDataTable from "@/components/views/list/shared/fleet-data-table";
import { INCIDENT_STATUS_OPTIONS } from "@/constants/transport";
import { IIncident } from "@/interfaces/transport";

const IncidentsDataTable: React.FC<{
  columns: any;
  data: any;
  loading?: boolean;
}> = ({ columns, data, loading }) => (
  <FleetDataTable<IIncident>
    entity='incident'
    columns={columns}
    data={data}
    loading={loading}
    statusOptions={INCIDENT_STATUS_OPTIONS}
    filters={<DatePickerWithRange loading={loading} />}
  />
);

export default IncidentsDataTable;