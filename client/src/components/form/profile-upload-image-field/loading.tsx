import React from "react";
import { IoIosCamera } from "react-icons/io";
import { Skeleton } from "@/components/ui/skeleton";

const Loading: React.FC = () => {
  return (
    <div className='flex items-center'>
      <div className='relative'>
        <Skeleton className='object-cover rounded-full w-[200px] h-[200px] md:w-[220px] md:h-[220px] border border-solid' />
        <div className='flex items-center justify-center absolute right-1 bottom-5 z-10 w-9 h-9 rounded-full overflow-hidden bg-secondary custom-shadow'>
          <IoIosCamera className='text-[22px] text-muted-foreground' />
        </div>
      </div>
    </div>
  );
};

export default Loading;
