import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton row matching the driver list/trip card grid. */
export const TripCardsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className='rounded-xl border bg-card p-4'>
        <div className='flex items-center justify-between'>
          <Skeleton className='h-5 w-28' />
          <Skeleton className='h-4 w-16' />
        </div>
        <Skeleton className='mt-3 h-4 w-3/4' />
        <Skeleton className='mt-2 h-4 w-1/2' />
        <div className='mt-4 flex gap-2'>
          <Skeleton className='h-9 w-24' />
          <Skeleton className='h-9 w-24' />
        </div>
      </div>
    ))}
  </div>
);

/** Skeleton for the dashboard hero + status column. */
export const DashboardSkeleton: React.FC = () => (
  <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
    <div className='rounded-xl border bg-card p-5 lg:col-span-2'>
      <Skeleton className='h-6 w-40' />
      <Skeleton className='mt-3 h-5 w-56' />
      <Skeleton className='mt-2 h-4 w-72' />
      <div className='mt-5 flex gap-2'>
        <Skeleton className='h-11 w-32' />
        <Skeleton className='h-11 w-32' />
      </div>
    </div>
    <div className='flex flex-col gap-4'>
      <Skeleton className='h-40 w-full rounded-xl' />
      <Skeleton className='h-28 w-full rounded-xl' />
    </div>
  </div>
);

/** Skeleton for the route timeline page. */
export const RouteTimelineSkeleton: React.FC = () => (
  <div className='rounded-xl border bg-card p-5'>
    <Skeleton className='h-6 w-48' />
    <div className='mt-5 space-y-4'>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className='flex items-center gap-3'>
          <Skeleton className='h-8 w-8 rounded-full' />
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-52' />
            <Skeleton className='h-3 w-32' />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Compact map-page placeholder for slow loads. */
export const MapPageSkeleton: React.FC = () => (
  <div className='grid h-full min-h-[60vh] grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]'>
    <Skeleton className='h-[60vh] w-full rounded-xl lg:h-auto' />
    <div className='space-y-3'>
      <Skeleton className='h-32 w-full rounded-xl' />
      <Skeleton className='h-24 w-full rounded-xl' />
      <Skeleton className='h-24 w-full rounded-xl' />
    </div>
  </div>
);

export default TripCardsSkeleton;