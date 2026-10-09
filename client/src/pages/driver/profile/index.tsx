import React from "react";
import { Link } from "react-router-dom";
import useAuthUser from "react-auth-kit/hooks/useAuthUser";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  BusFront,
  Mail,
  MapPinned,
  Phone,
  Route as RouteIcon,
  UserRound,
} from "lucide-react";

import { TUser } from "@/interfaces/user";
import { useDriverWorkspace } from "@/components/views/driver/features";
import LiveStatusBadge from "@/components/views/driver/live-status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const DriverProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthUser<TUser>() as TUser | null;
  const workspace = useDriverWorkspace();
  const bus = workspace.assigned;

  return (
    <div className='flex flex-col gap-5'>
      <h1 className='text-xl font-bold tracking-tight md:text-2xl'>
        {t("driver_profile.title")}
      </h1>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
        {/* Identity card */}
        <section className='overflow-hidden rounded-2xl border bg-card shadow-sm lg:col-span-2'>
          <div className='h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-sky-500/10' />
          <div className='px-5 pb-5'>
            <div className='-mt-9 flex items-end gap-4'>
              {user?.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={user.fullName}
                  className='h-20 w-20 rounded-2xl border-4 border-background bg-muted object-cover shadow-md'
                />
              ) : (
                <span className='flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-background bg-primary/10 text-3xl font-bold text-primary shadow-md'>
                  {user?.fullName?.charAt(0)?.toUpperCase() ?? "D"}
                </span>
              )}
              <div className='flex-1 pb-0.5'>
                <div className='flex flex-wrap items-center gap-2'>
                  <h2 className='text-xl font-bold leading-tight'>{user?.fullName}</h2>
                  <span className='inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary'>
                    <BadgeCheck className='h-3.5 w-3.5' />
                    {t("driver_profile.driver_role")}
                  </span>
                </div>
                <p className='text-sm text-muted-foreground'>
                  {user?.email || user?.username}
                </p>
              </div>
            </div>

            <dl className='mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <ContactRow icon={<Phone className='h-4 w-4' />} value={user?.phoneNumber || "—"} />
              <ContactRow icon={<Mail className='h-4 w-4' />} value={user?.email || "—"} />
              <ContactRow
                icon={<UserRound className='h-4 w-4' />}
                value={`@${user?.username || "—"}`}
              />
              <ContactRow
                icon={<MapPinned className='h-4 w-4' />}
                value={user?.address || "—"}
              />
            </dl>
          </div>
        </section>

        {/* Assigned vehicle */}
        <section className='flex flex-col gap-4'>
          <div className='rounded-2xl border bg-card p-5 shadow-sm'>
            <h2 className='text-base font-semibold'>{t("driver_profile.my_vehicle")}</h2>
            {workspace.loadingBus ? (
              <div className='mt-4 space-y-3'>
                <Skeleton className='h-10 w-10 rounded-xl' />
                <Skeleton className='h-5 w-32' />
                <Skeleton className='h-4 w-24' />
              </div>
            ) : bus ? (
              <>
                <div className='mt-4 flex items-center gap-3'>
                  <span className='flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                    <BusFront className='h-6 w-6' />
                  </span>
                  <div>
                    <div className='text-lg font-bold leading-tight'>{bus.busNumber}</div>
                    <div className='truncate text-xs text-muted-foreground'>
                      {bus.name || bus.registrationNumber || "—"}
                    </div>
                  </div>
                </div>
                <div className='mt-3 flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>{t("driver_profile.gps_status")}</span>
                  <LiveStatusBadge status={bus ? workspace.freshness : "OFFLINE"} size='sm' />
                </div>
                <div className='mt-6 flex flex-col gap-2'>
                  <Button variant='outline' className='justify-start gap-2' asChild>
                    <Link to='/driver/bus'>
                      <BusFront className='h-4 w-4' />
                      {t("driver_profile.view_bus")}
                    </Link>
                  </Button>
                  <Button variant='outline' className='justify-start gap-2' asChild>
                    <Link to='/driver/route'>
                      <RouteIcon className='h-4 w-4' />
                      {t("driver_profile.view_route")}
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <p className='mt-4 text-sm text-muted-foreground'>
                {t("driver_profile.no_vehicle")}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const ContactRow: React.FC<{ icon: React.ReactNode; value: string }> = ({ icon, value }) => (
  <div className='flex items-center gap-2.5 rounded-lg border bg-muted/40 px-3 py-2.5'>
    <span className='text-muted-foreground'>{icon}</span>
    <span className='truncate text-sm font-medium'>{value}</span>
  </div>
);

export default DriverProfilePage;