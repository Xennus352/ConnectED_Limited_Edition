import React from "react";

import FleetDataTable from "@/components/views/list/shared/fleet-data-table";
import { IRoute } from "@/interfaces/transport";

const RoutesDataTable: React.FC<{
  columns: any;
  data: any;
  loading?: boolean;
}> = ({ columns, data, loading }) => (
  <FleetDataTable<IRoute>
    entity='route'
    columns={columns}
    data={data}
    loading={loading}
  />
);

export default RoutesDataTable;