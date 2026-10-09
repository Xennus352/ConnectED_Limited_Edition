import React from "react";

import FleetAddBtn from "@/components/views/list/shared/fleet-data-table/fleet-add-btn";

const AddBtn: React.FC<{ loading?: boolean }> = ({ loading }) => (
  <FleetAddBtn loading={loading} entity='trip' />
);

export default AddBtn;