import React from "react";

import FleetDataTable from "@/components/views/list/shared/fleet-data-table";
import { MAINTENANCE_STATUS_OPTIONS } from "@/constants/transport";
import { IMaintenanceRecord } from "@/interfaces/transport";

const MaintenanceDataTable: React.FC<{
  columns: any;
  data: any;
  loading?: boolean;
}> = ({ columns, data, loading }) => (
  <FleetDataTable<IMaintenanceRecord>
    entity='maintenance'
    columns={columns}
    data={data}
    loading={loading}
    statusOptions={MAINTENANCE_STATUS_OPTIONS}
  />
);

export default MaintenanceDataTable;