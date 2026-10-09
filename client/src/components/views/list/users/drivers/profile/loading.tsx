import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const Loading: React.FC = () => {
  return (
    <div className='grid grid-cols-1 gap-6 w-full'>
      <Card className='relative px-6 py-8 flex flex-col lg:flex-row items-center gap-4 sm:gap-6 md:gap-8 shadow-lg'>
        <Skeleton className='w-[150px] min-w-[150px] h-[150px] min-h-[150px] lg:w-[200px] lg:min-w-[200px] lg:h-[200px] lg:min-h-[200px] rounded-full' />
        <div className='flex-grow space-y-3 w-full'>
          <Skeleton className='h-7 w-1/2' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-2/3' />
        </div>
      </Card>
    </div>
  );
};

export default Loading;