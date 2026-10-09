import React from "react";
import { BusFront } from "lucide-react";

import { IDriver } from "@/interfaces/user";

const BusInfo: React.FC<{ row: any }> = ({ row }) => {
  const driver = row.original as IDriver;
  const bus = driver.bus;

  if (!bus) {
    return <span className='text-sm text-muted-foreground'>-</span>;
  }

  return (
    <div className='flex items-center gap-2'>
      <BusFront className='w-4 h-4 text-muted-foreground shrink-0' />
      <span className='text-sm font-medium'>{bus.busNumber}</span>
      <span className='text-xs text-muted-foreground truncate max-w-[140px]'>
        {bus.registrationNumber}
      </span>
    </div>
  );
};

export default BusInfo;