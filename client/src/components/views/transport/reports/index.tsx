import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { CalendarIcon, Download, FileText } from "lucide-react";

import { useReportsService } from "@/services/transport";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CATEGORY_OPTIONS = [
  "fleet",
  "trips",
  "routes",
  "drivers",
  "maintenance",
  "expenses",
  "students",
];

/** The report category endpoints read `from`/`to` URL params. */
const ReportRangePicker: React.FC<{ loading?: boolean }> = ({ loading }) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const selected = useMemo(() => {
    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;
    return {
      from: from && !Number.isNaN(from.getTime()) ? from : undefined,
      to: to && !Number.isNaN(to.getTime()) ? to : undefined,
    };
  }, [fromParam, toParam]);

  const handleSelect = (range: { from?: Date; to?: Date }) => {
    const next = new URLSearchParams(searchParams);
    if (range?.from) next.set("from", format(range.from, "yyyy-MM-dd"));
    else next.delete("from");
    if (range?.to) next.set("to", format(range.to, "yyyy-MM-dd"));
    else next.delete("to");
    setSearchParams(next);
    if (range?.from && range?.to) setOpen(false);
  };

  const clear = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("from");
    next.delete("to");
    setSearchParams(next);
  };

  if (loading) return <Skeleton className='h-8 w-56' />;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant='outline' className='h-8 justify-start gap-2 font-normal'>
          <CalendarIcon className='h-3.5 w-3.5' />
          {selected.from && selected.to
            ? `${format(selected.from, "PP")} — ${format(selected.to, "PP")}`
            : t("report_form.select_range")}
          {selected.from && (
            <span
              onClick={(event) => {
                event.stopPropagation();
                clear();
              }}
              className='ml-1 text-muted-foreground hover:text-foreground'
            >
              ✕
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto" align="end">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={selected}
          onSelect={(range: { from?: Date; to?: Date } | undefined) =>
            handleSelect(range ?? {})
          }
        />
      </PopoverContent>
    </Popover>
  );
};

interface ISummaryCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
}

const SummaryCard: React.FC<ISummaryCardProps> = ({ label, value, hint }) => (
  <Card>
    <CardHeader className='pb-1'>
      <CardTitle className='text-sm font-medium text-muted-foreground'>
        {label}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className='text-2xl font-bold tabular-nums'>{value}</div>
      {hint && <div className='text-xs text-muted-foreground'>{hint}</div>}
    </CardContent>
  </Card>
);

const ReportsPageView: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState("trips");
  const { getSummary, useCategory, downloadCsv } = useReportsService();

  const { data: summary, isLoading: summaryLoading } = getSummary;

  const rangeParams = useMemo(
    () => ({
      ...(searchParams.get("from") ? { from: searchParams.get("from")! } : {}),
      ...(searchParams.get("to") ? { to: searchParams.get("to")! } : {}),
    }),
    [searchParams]
  );

  const { data: categoryData, isLoading: categoryLoading } = useCategory(
    category,
    rangeParams
  );

  const rows: Record<string, any>[] = categoryData?.data ?? [];
  const totals: Record<string, any> = categoryData?.totals ?? {};
  const columns = rows.length ? Object.keys(rows[0]).filter((key) => key !== "_id") : [];

  const handleDownload = async () => {
    await downloadCsv(category, rangeParams);
  };

  return (
    <div className='flex flex-col gap-6'>
      <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3'>
        {summaryLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className='h-28' />
          ))
        ) : (
          <>
            <SummaryCard
              label={t("report_form.fleet_size")}
              value={summary?.fleet?.fleetSize ?? 0}
            />
            <SummaryCard
              label={t("report_form.running_buses")}
              value={summary?.fleet?.running ?? 0}
            />
            <SummaryCard
              label={t("report_form.restricted_buses")}
              value={summary?.fleet?.maintenanceRestricted ?? 0}
              hint={t("report_form.restricted_hint")}
            />
            <SummaryCard
              label={t("report_form.trips_completed")}
              value={summary ? `${summary.trips?.completionRate ?? 0}%` : "—"}
              hint={`${summary?.trips?.completed ?? 0} / ${summary?.trips?.total ?? 0}`}
            />
            <SummaryCard
              label={t("report_form.total_distance")}
              value={summary ? `${summary.performance?.totalDistanceKm ?? 0} km` : "—"}
            />
            <SummaryCard
              label={t("report_form.expenses")}
              value={
                summary
                  ? `$${((summary.expenses?.maintenance ?? 0) + (summary.expenses?.fuel ?? 0)).toLocaleString()}`
                  : "—"
              }
              hint={`${t("report_form.maint")} $${(summary?.expenses?.maintenance ?? 0).toLocaleString()} · ${t("report_form.fuel")} $${(summary?.expenses?.fuel ?? 0).toLocaleString()}`}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0'>
          <CardTitle className='text-base'>
            <span className='inline-flex items-center gap-2'>
              <FileText className='h-4 w-4 text-muted-foreground' />
              {t("report_form.category_report", { category })}
            </span>
          </CardTitle>
          <div className='flex items-center gap-2'>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className='h-8 w-[150px] capitalize'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option} className='capitalize'>
                    {t(`report_form.category_${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ReportRangePicker loading={categoryLoading} />
            <Button
              variant='outline'
              size='sm'
              className='h-8 gap-1'
              onClick={handleDownload}
            >
              <Download className='h-3.5 w-3.5' />
              {t("report_form.download_csv")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {categoryLoading ? (
            <Skeleton className='h-48 w-full' />
          ) : rows.length === 0 ? (
            <div className='flex flex-col items-center gap-2 py-12 text-center text-muted-foreground'>
              <FileText className='h-8 w-8' />
              <p className='text-sm'>{t("report_form.no_rows")}</p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={column} className='capitalize whitespace-nowrap'>
                        {column.replace(/_/g, " ")}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={row._id ?? index}>
                      {columns.map((column) => (
                        <TableCell key={column}>
                          {formatCell(row[column])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {Object.keys(totals).length > 0 && (
                <div className='mt-3 border-t pt-2 text-xs text-muted-foreground tabular-nums'>
                  {t("report_form.totals")}:{" "}
                  {Object.entries(totals)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" · ")}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const formatCell = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    const text = JSON.stringify(value);
    return <span className='max-w-[220px] truncate block'>{text}</span>;
  }
  return String(value);
};

export default ReportsPageView;