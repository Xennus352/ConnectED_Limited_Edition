import React from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Info,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import useProfilePageFeatures from "./features";

/**
 * A teacher's own profile is strictly read-only: account records are owned by
 * the school administration (the server rejects teacher writes with a 403).
 * This view shows the teacher their real details instead of an edit form
 * whose submit would just fail.
 */
const TeacherProfile: React.FC = () => {
  const { t } = useTranslation();
  const { initialValues, error, isTeacherDataLoading } =
    useProfilePageFeatures();

  const details: Array<{
    label: string;
    icon: React.ReactNode;
    value: string;
  }> = [
    {
      label: t("user_form.username"),
      icon: <UserRound className='h-4 w-4 text-muted-foreground' />,
      value: initialValues.username || "—",
    },
    {
      label: t("user_form.phoneNumber"),
      icon: <Phone className='h-4 w-4 text-muted-foreground' />,
      value: initialValues.phoneNumber || "—",
    },
    {
      label: t("user_form.email"),
      icon: <Mail className='h-4 w-4 text-muted-foreground' />,
      value: initialValues.email || "—",
    },
    {
      label: t("user_form.gender"),
      icon: <UserRound className='h-4 w-4 text-muted-foreground' />,
      value: initialValues.gender
        ? t(`user_form.${initialValues.gender}`)
        : "—",
    },
    {
      label: t("user_form.birthday"),
      icon: <CalendarDays className='h-4 w-4 text-muted-foreground' />,
      value: initialValues.birthday
        ? format(new Date(initialValues.birthday), "MMMM dd, yyyy")
        : "—",
    },
  ];

  return (
    <div className='pt-6'>
      {isTeacherDataLoading ? (
        <>
          <div className='flex items-center gap-4 rounded-xl border bg-card p-5'>
            <Skeleton className='h-16 w-16 rounded-full' />
            <div className='flex-1 space-y-2'>
              <Skeleton className='h-5 w-40' />
              <Skeleton className='h-4 w-24' />
            </div>
          </div>
          <div className='mt-4 grid gap-3 sm:grid-cols-2'>
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className='h-16 rounded-xl' />
            ))}
          </div>
        </>
      ) : error ? (
        <div className='rounded-xl border border-error/30 bg-error/10 px-4 py-6 text-center text-sm text-error'>
          {error}
        </div>
      ) : (
        <>
          {/* Identity header */}
          <div className='flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5 shadow-sm'>
            {initialValues.profilePhoto ? (
              <img
                src={initialValues.profilePhoto}
                alt={initialValues.fullName}
                className='h-16 w-16 rounded-full border object-cover'
              />
            ) : (
              <div className='flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary'>
                {(initialValues.fullName || "T").charAt(0)}
              </div>
            )}
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <h3 className='text-lg font-bold tracking-tight'>
                  {initialValues.fullName || "—"}
                </h3>
                <Badge variant='default'>
                  <BookOpen className='mr-1 h-3 w-3' />
                  {t("teacher_dashboard.role_teacher")}
                </Badge>
              </div>
              <p className='mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground'>
                <BadgeCheck className='h-4 w-4 text-success' />
                {t("teacher_dashboard.profile_status", {
                  status: t(`data-table.status_options.${initialValues.status || "active"}`),
                })}
              </p>
            </div>
          </div>

          {/* Details grid */}
          <div className='mt-4 grid gap-3 sm:grid-cols-2'>
            {details.map((detail) => (
              <div
                key={detail.label}
                className='flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm'
              >
                <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted'>
                  {detail.icon}
                </span>
                <div className='min-w-0'>
                  <p className='text-xs text-muted-foreground'>{detail.label}</p>
                  <p className='break-words text-sm font-medium'>{detail.value}</p>
                </div>
              </div>
            ))}
            <div className='flex items-start gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm sm:col-span-2'>
              <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted'>
                <MapPin className='h-4 w-4 text-muted-foreground' />
              </span>
              <div className='min-w-0 flex-1'>
                <p className='text-xs text-muted-foreground'>{t("user_form.address")}</p>
                <p className='break-words text-sm font-medium [overflow-wrap:anywhere]'>
                  {initialValues.address || "—"}
                </p>
              </div>
            </div>
            <div className='flex items-start gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm sm:col-span-2'>
              <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted'>
                <BookOpen className='h-4 w-4 text-muted-foreground' />
              </span>
              <div className='min-w-0'>
                <p className='text-xs text-muted-foreground'>{t("user_form.bio")}</p>
                <p className='whitespace-pre-wrap text-sm font-medium'>
                  {initialValues.bio || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Read-only notice */}
          <div className='mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning'>
            <Info className='mt-0.5 h-4 w-4 shrink-0' />
            <p>{t("teacher_dashboard.profile_read_only_note")}</p>
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherProfile;