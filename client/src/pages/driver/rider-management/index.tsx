import React, { useState } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import {
  Clock,
  Edit,
  MapPin,
  Plus,
  Route as RouteIcon,
  Trash,
  Users,
} from "lucide-react";

import useAxiosInstance from "@/api";
import { useDriverWorkspace } from "@/components/views/driver/features";
import useQueryHandler from "@/hooks/useQueryHandler";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

import RiderFormDialog from "./customs/rider-form-dialog";
import type { Rider, RiderFormValues, StopOption } from "./customs/types";

/** Sentinel value for the "all stops" filter option (Radix needs a string). */
const ALL_STOPS = "__all__";

const getInitials = (fullName?: string): string => {
  if (!fullName) return "";
  return fullName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

/** Pulls the server's error message out of an axios failure, when present. */
const apiErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)
      ?.message;
    return message ?? fallback;
  }
  return fallback;
};

interface AssignmentDto {
  id: string;
  studentId: string | null;
  busId: string;
  routeId?: string | null;
  pickupStopId?: string | null;
  dropoffStopId?: string | null;
  pickupStopName?: string | null;
  dropoffStopName?: string | null;
  student?: { id: string; fullName: string; profilePhoto?: string | null } | null;
}

const toRider = (assignment: AssignmentDto): Rider => ({
  id: assignment.id,
  studentId: assignment.studentId ?? assignment.student?.id ?? "",
  fullName: assignment.student?.fullName ?? "—",
  profilePhoto: assignment.student?.profilePhoto ?? null,
  pickupStopId: assignment.pickupStopId ?? null,
  dropoffStopId: assignment.dropoffStopId ?? null,
  pickupStopName: assignment.pickupStopName ?? null,
  dropoffStopName: assignment.dropoffStopName ?? null,
});

const RiderManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const $axios = useAxiosInstance();
  const workspace = useDriverWorkspace();
  const bus = workspace.assigned;
  const route = bus?.route;

  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editingRider, setEditingRider] = useState<Rider | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Rider | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stops: StopOption[] = ((route?.stops ?? []) as StopOption[]).filter(
    (stop) => stop.isActive !== false
  );

  const ridersQuery = useQueryHandler({
    queryKey: ["driver", "assignments", bus?.id ?? "none"],
    queryFn: async () => {
      try {
        const response = await $axios.get("/driver/assignments");
        const rows = (response.data?.data ?? []) as AssignmentDto[];
        return rows.map(toRider);
      } catch (error) {
        console.error("Failed to fetch riders:", error);
        toast({
          variant: "destructive",
          title: apiErrorMessage(error, t("rider_form.action_failed")),
        });
        return [];
      }
    },
    enabled: Boolean(bus),
  });

  const riders: Rider[] = ridersQuery.data ?? [];
  const ridersLoading = ridersQuery.isFetching;

  // ----- mutations --------------------------------------------------------

  const submitRider = async (
    values: RiderFormValues,
    mode: "create" | "edit"
  ) => {
    setSubmitting(true);
    try {
      const result =
        mode === "create"
          ? await $axios.post("/driver/assignments/create", {
              studentId: values.studentId,
              pickupStopId: values.pickupStopId,
              dropoffStopId: values.dropoffStopId,
            })
          : editingRider
            ? await $axios.put(`/driver/assignments/${editingRider.id}`, {
                studentId: values.studentId,
                pickupStopId: values.pickupStopId,
                dropoffStopId: values.dropoffStopId,
              })
            : null;

      if (result?.data?.success) {
        setCreateOpen(false);
        setEditOpen(false);
        setEditingRider(null);
        ridersQuery.refetch();
        toast({
          title:
            mode === "create"
              ? t("rider_form.create_success")
              : t("rider_form.update_success"),
        });
      } else {
        toast({
          variant: "destructive",
          title:
            result?.data?.message ??
            (mode === "create"
              ? t("rider_form.create_failed")
              : t("rider_form.update_failed")),
        });
      }
    } catch (error) {
      console.error(`Failed to ${mode} rider:`, error);
      toast({
        variant: "destructive",
        title: apiErrorMessage(error, t("rider_form.action_failed")),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const riderId = deleteTarget.id;
    setDeleteTarget(null);

    try {
      const response = await $axios.delete(`/driver/assignments/${riderId}`);
      const result = response.data;

      if (result.success) {
        ridersQuery.refetch();
        toast({ title: t("rider_form.delete_success") });
      } else {
        toast({
          variant: "destructive",
          title: result.message ?? t("rider_form.delete_failed"),
        });
      }
    } catch (error) {
      console.error("Failed to delete rider:", error);
      toast({
        variant: "destructive",
        title: apiErrorMessage(error, t("rider_form.action_failed")),
      });
    }
  };

  // ----- derived ----------------------------------------------------------

  const stopName = (stopId?: string | null): string => {
    if (!stopId) return "—";
    return stops.find((stop) => stop.id === stopId)?.name ?? "—";
  };

  const filteredRiders = selectedStop
    ? riders.filter(
        (rider) =>
          rider.pickupStopId === selectedStop || rider.dropoffStopId === selectedStop
      )
    : riders;

  const searchableRiders = filteredRiders.filter((rider) => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return true;
    return (
      rider.fullName.toLowerCase().includes(needle) ||
      (rider.pickupStopName ?? "").toLowerCase().includes(needle) ||
      (rider.dropoffStopName ?? "").toLowerCase().includes(needle)
    );
  });

  const boardingCount = selectedStop
    ? riders.filter((rider) => rider.pickupStopId === selectedStop).length
    : riders.filter((rider) => rider.pickupStopId).length;

  const alightingCount = selectedStop
    ? riders.filter((rider) => rider.dropoffStopId === selectedStop).length
    : riders.filter((rider) => rider.dropoffStopId).length;

  if (workspace.loadingBus) return <RiderSkeleton />;

  if (!bus || !route || stops.length === 0) {
    return (
      <div className='flex flex-col gap-4'>
        <EmptyStateRider
          icon={<MapPin className='h-7 w-7' />}
          title={t("rider_management.no_stops")}
          description={t("rider_management.no_stops_desc")}
          action={
            <Button variant='outline' onClick={workspace.refetch}>
              {t("driver_common.try_again")}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-xl font-bold tracking-tight md:text-2xl'>
            {t("rider_management.title")}
          </h1>
          <p className='mt-0.5 flex items-center gap-2 text-sm text-muted-foreground'>
            <RouteIcon className='h-4 w-4' />
            <span className='font-semibold text-foreground'>{route?.name}</span>
            <span>{route?.startLocation} → {route?.endLocation}</span>
          </p>
        </div>

        <div className='flex items-center gap-2'>
          {/* Create Rider Button */}
          <Button
            variant='outline'
            onClick={() => setCreateOpen(true)}
            className='flex items-center gap-2'
          >
            <Plus className='h-4 w-4' />
            {t("rider_management.add_rider")}
          </Button>

          {/* Stop Filter */}
          {stops.length > 0 && (
            <Select
              value={selectedStop ?? ALL_STOPS}
              onValueChange={(value) =>
                setSelectedStop(value === ALL_STOPS ? null : value)
              }
            >
              <SelectTrigger className='w-48'>
                <SelectValue placeholder={t("rider_management.all_stops")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STOPS}>
                  {t("rider_management.all_stops")}
                </SelectItem>
                {stops.map((stop) => (
                  <SelectItem key={stop.id} value={stop.id}>
                    {stop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Search */}
          <Input
            placeholder={t("rider_management.search_riders")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-48'
          />
        </div>
      </div>

      {/* Riders Table */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm text-muted-foreground'>
              <span className='inline-flex items-center gap-2'>
                <Users className='h-4 w-4 text-muted-foreground' />
                {t("rider_management.riders_at_stops", {
                  count: ridersLoading ? 0 : filteredRiders.length,
                })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ridersLoading && !searchableRiders.length ? (
              <div className='space-y-3'>
                <Skeleton className='h-9 w-full' />
                <Skeleton className='h-9 w-full' />
                <Skeleton className='h-9 w-full' />
              </div>
            ) : searchableRiders.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                {t("rider_management.no_riders_found")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>{t("rider_management.student_name")}</TableCell>
                    <TableCell>{t("rider_management.stop")}</TableCell>
                    <TableCell className='text-center'>{t("rider_management.action")}</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchableRiders.map((rider) => (
                    <TableRow key={rider.id} className='hover:bg-muted/50'>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          {rider.profilePhoto ? (
                            <img
                              src={rider.profilePhoto}
                              alt={rider.fullName}
                              className='h-6 w-6 rounded-full object-cover'
                            />
                          ) : (
                            <div className='flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary'>
                              {getInitials(rider.fullName)}
                            </div>
                          )}
                          <span className='min-w-0'>
                            <span className='block truncate font-medium'>
                              {rider.fullName}
                            </span>
                            <span className='block text-[11px] text-muted-foreground'>
                              {stopName(rider.pickupStopId)} →{" "}
                              {stopName(rider.dropoffStopId)}
                            </span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className='text-xs text-muted-foreground'>
                        {(rider.pickupStopName ?? rider.dropoffStopName) || "—"}
                      </TableCell>
                      <TableCell className='text-center'>
                        <div className='flex justify-center gap-1'>
                          <Button
                            variant='outline'
                            size='icon'
                            aria-label={t("rider_management.edit_rider")}
                            title={t("rider_management.edit_rider")}
                            onClick={() => {
                              setEditingRider(rider);
                              setEditOpen(true);
                            }}
                          >
                            <Edit className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='destructive'
                            size='icon'
                            aria-label={t("rider_management.delete_action")}
                            title={t("rider_management.delete_action")}
                            onClick={() => setDeleteTarget(rider)}
                          >
                            <Trash className='h-4 w-4' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Rider Actions / Summary */}
        {selectedStop ? (
          <Card>
            <CardHeader className='pb-1'>
              <CardTitle className='text-sm text-muted-foreground'>
                <span className='inline-flex items-center gap-2'>
                  <MapPin className='h-4 w-4 text-muted-foreground' />
                  {t("rider_management.stop_details", {
                    stopName: stopName(selectedStop),
                  })}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-muted-foreground'>{t("rider_management.boarding")}</span>
                  <span className='font-medium text-primary'>{boardingCount}</span>
                </div>

                <div className='flex items-center justify-between'>
                  <span className='text-sm text-muted-foreground'>{t("rider_management.alighting")}</span>
                  <span className='font-medium text-primary'>{alightingCount}</span>
                </div>

                <div className='flex items-center justify-between pt-1'>
                  <span className='text-xs text-muted-foreground'>{t("rider_management.total_students_on_bus")}</span>
                  <span className='font-medium'>{bus?.studentCount ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className='pb-1'>
              <CardTitle className='text-sm text-muted-foreground'>
                <span className='inline-flex items-center gap-2'>
                  <Clock className='h-4 w-4 text-muted-foreground' />
                  {t("rider_management.route_overview")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground'>
                {t("rider_management.select_stop_to_view_details")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add / Edit rider modal */}
      <RiderFormDialog
        open={createOpen || editOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          setEditOpen(open);
          if (!open) setEditingRider(null);
        }}
        mode={editOpen && editingRider ? "edit" : "create"}
        rider={editingRider}
        stops={stops}
        submitting={submitting}
        onSubmit={(values) => submitRider(values, editOpen ? "edit" : "create")}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rider_management.delete_confirmation_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("rider_management.delete_confirmation_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={handleDelete}>
            {t("rider_management.delete_action")}
          </AlertDialogAction>
          <AlertDialogCancel>{t("rider_management.delete_cancel")}</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const RiderSkeleton: React.FC = () => (
  <div className='flex flex-col gap-5'>
    <div className='flex items-center justify-between gap-3'>
      <Skeleton className='h-7 w-52' />
      <Skeleton className='h-9 w-32' />
    </div>
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
      <Card>
        <CardHeader className='pb-1'>
          <Skeleton className='h-4 w-40' />
        </CardHeader>
        <CardContent className='space-y-3'>
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='pb-1'>
          <Skeleton className='h-4 w-32' />
        </CardHeader>
        <CardContent className='space-y-3'>
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-2/3' />
        </CardContent>
      </Card>
    </div>
  </div>
);

const EmptyStateRider: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className='flex flex-col gap-4'>
    <span className='mx-auto text-muted-foreground [&_svg]:h-12 [&_svg]:w-12'>
      {icon}
    </span>
    <h2 className='text-xl font-bold tracking-tight'>{title}</h2>
    <p className='text-muted-foreground'>{description}</p>
    {action}
  </div>
);

export default RiderManagementPage;