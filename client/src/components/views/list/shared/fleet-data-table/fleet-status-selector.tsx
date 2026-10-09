import React from "react";
import { useSearchParams } from "react-router-dom";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IFleetStatusSelectorProps {
  options: { value: string; label: string }[];
  /** URL param used to persist the selection. Defaults to "status". */
  param?: string;
}

/**
 * Status filter for transport tables. Writes the selected value into the
 * URL search string so the list query refetches server-filtered rows.
 */
const FleetStatusSelector: React.FC<IFleetStatusSelectorProps> = ({
  options,
  param = "status",
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentStatus = searchParams.get(param) || "";

  const handleSelectChange = (value: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (value) newSearchParams.set(param, value);
    else newSearchParams.delete(param);
    setSearchParams(newSearchParams);
  };

  return (
    <Select value={currentStatus} onValueChange={handleSelectChange}>
      <SelectTrigger className='w-[180px]'>
        <SelectValue placeholder='All' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value=''>All</SelectItem>
        {options?.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default FleetStatusSelector;