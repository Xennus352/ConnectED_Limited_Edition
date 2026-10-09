import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  BellRing,
  CheckCheck,
  MapPinned,
  Navigation,
  RefreshCw,
  Route as RouteIcon,
  Wrench,
  Zap,
} from "lucide-react";

import { useDriverWorkspace } from "@/components/views/driver/features";
import {
  buildDriverAlerts,
  useDriverAlertReadState,
  type DriverAlert,
  type DriverAlertCategory,
} from "@/components/views/driver/alerts";
import LiveStatusBadge from "@/components/views/driver/live-status-badge";
import EmptyState from "@/components/views/driver/empty-state";
import { IncidentReportDialog } from "@/components/views/driver/incident-report";
import { Button } from "@/components/ui/button";

const FILTERS: Array<{ key: string; category: DriverAlertCategory | "ALL" }> = [
  { key: "driver_alerts.all", category: "ALL" },
  { key: "driver_alerts.gps", category: "GPS" },
  { key: "driver_alerts.trip", category: "TRIP" },
  { key: "driver_alerts.maintenance", category: "MAINTENANCE" },
  { key: "driver_alerts.incident", category: "INCIDENT" },
  { key: "driver_alerts.system", category: "SYSTEM" },
];

const CATEGORY_META: Record<
  DriverAlertCategory,
  { icon: React.ReactNode; chip: string }
> = {
  GPS: {
    icon: <Navigation className='h-4 w-4' />,
    chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  TRIP: {
    icon: <MapPinned className='h-4 w-4' />,
    chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  ROUTE: {
    icon: <RouteIcon className='h-4 w-4' />,
    chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  MAINTENANCE: {
    icon: <Wrench className='h-4 w-4' />,
    chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  INCIDENT: {
    icon: <AlertTriangle className='h-4 w-4' />,
    chip: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  SYSTEM: {
    icon: <Zap className='h-4 w-4' />,
    chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
};

const SEVERITY_RING: Record<DriverAlert["severity"], string> = {
  info: "border-border",
  warning: "border-l-amber-500/70",
  critical: "border-l-red-500/80",
};

const timeAgo = (ms: number): string => {
  const seconds = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
};

const DriverAlertsPage: React.FC = () => {
  const { t } = useTranslation();
  const workspace = useDriverWorkspace();
  const { read, markRead, markAllRead } = useDriverAlertReadState();

  const [filter, setFilter] = React.useState<DriverAlertCategory | "ALL">("ALL");
  const [incidentOpen, setIncidentOpen] = React.useState(false);

  const alerts = buildDriverAlerts(workspace);
  const shown = filter === "ALL" ? alerts : alerts.filter((a) => a.category === filter);
  const unreadCount = alerts.filter((a) => !read.has(a.id)).length;

  return (
    <div className='flex flex-col gap-5'>
      {/* Header ----------------------------------------------------------- */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-xl font-bold tracking-tight md:text-2xl'>
            {t("driver_alerts.title")}
          </h1>
          <p className='mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground'>
            <BellRing className='h-4 w-4' />
            {unreadCount > 0
              ? t("driver_alerts.unread_count", { count: unreadCount })
              : t("driver_alerts.all_read")}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <LiveStatusBadge status={workspace.freshness} size='sm' />
          <Button
            variant='outline'
            size='sm'
            className='gap-1.5'
            onClick={workspace.refetch}
          >
            <RefreshCw className='h-3.5 w-3.5' />
            {t("driver_trips.refresh")}
          </Button>
          <Button
            variant='secondary'
            size='sm'
            className='gap-1.5'
            disabled={shown.length === 0}
            onClick={() => markAllRead(shown.map((a) => a.id))}
          >
            <CheckCheck className='h-3.5 w-3.5' />
            {t("driver_alerts.mark_all_read")}
          </Button>
        </div>
      </div>

      {/* Filters ----------------------------------------------------------- */}
      <div className='flex flex-wrap gap-2'>
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type='button'
            onClick={() => setFilter(item.category)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              filter === item.category
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(item.key)}
          </button>
        ))}
      </div>

      {/* Feed --------------------------------------------------------------- */}
      {shown.length === 0 ? (
        <EmptyState
          icon={<BellRing className='h-7 w-7' />}
          title={t("driver_alerts.no_alerts")}
          description={t("driver_alerts.no_alerts_desc")}
        />
      ) : (
        <ul className='flex flex-col gap-2'>
          {shown.map((alert) => {
            const meta = CATEGORY_META[alert.category];
            const isRead = read.has(alert.id);
            return (
              <li key={alert.id}>
                <AlertRow
                  alert={alert}
                  isRead={isRead}
                  icon={meta.icon}
                  chip={meta.chip}
                  ring={SEVERITY_RING[alert.severity]}
                  onSeen={() => markRead(alert.id)}
                  onReport={() => {
                    markRead(alert.id);
                    setIncidentOpen(true);
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}

      <IncidentReportDialog
        open={incidentOpen}
        onOpenChange={setIncidentOpen}
        reportIncident={workspace.actions.reportIncident}
      />
    </div>
  );
};

const AlertRow: React.FC<{
  alert: DriverAlert;
  isRead: boolean;
  icon: React.ReactNode;
  chip: string;
  ring: string;
  onSeen: () => void;
  onReport: () => void;
}> = ({ alert, isRead, icon, chip, ring, onSeen, onReport }) => {
  const { t } = useTranslation();

  const content = (
    <div className='flex min-w-0 flex-1 items-start gap-3'>
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${chip}`}>
        {icon}
      </span>
      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-2'>
          <span className='text-sm font-semibold leading-snug'>
            {t(alert.titleKey, alert.titleValues)}
          </span>
          <span className='ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground'>
            {timeAgo(alert.time)}
          </span>
        </div>
        {alert.descriptionKey ? (
          <p className='mt-0.5 line-clamp-2 text-xs text-muted-foreground'>
            {t(alert.descriptionKey, alert.descriptionValues)}
          </p>
        ) : null}
        <AlertAction alert={alert} onReport={onReport} />
      </div>
    </div>
  );

  const ringClass = isRead ? "border-border bg-card/60" : `border-l-2 bg-card ${ring}`;

  if (alert.action === "open-map") {
    return (
      <Link
        to='/driver/map'
        onClick={onSeen}
        className={`driver-alert-enter flex items-start gap-3 rounded-xl border py-3 pl-4 pr-3 shadow-sm transition-colors hover:bg-accent ${ringClass}`}
      >
        {content}
      </Link>
    );
  }
  if (alert.action === "open-trips") {
    return (
      <Link
        to='/driver/trips'
        onClick={onSeen}
        className={`driver-alert-enter flex items-start gap-3 rounded-xl border py-3 pl-4 pr-3 shadow-sm transition-colors hover:bg-accent ${ringClass}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      onClick={onSeen}
      className={`driver-alert-enter flex w-full items-start gap-3 rounded-xl border py-3 pl-4 pr-3 shadow-sm transition-colors ${ringClass}`}
    >
      {content}
      {!isRead ? (
        <span className='mt-2 h-2 w-2 shrink-0 rounded-full bg-primary' title={t("driver_alerts.unread")} />
      ) : null}
    </div>
  );
};

const AlertAction: React.FC<{ alert: DriverAlert; onReport: () => void }> = ({
  alert,
  onReport,
}) => {
  const { t } = useTranslation();
  const href =
    alert.action === "open-map"
      ? t("driver_alerts.action_map")
      : alert.action === "open-trips"
        ? t("driver_alerts.action_trips")
        : alert.action === "reconnect"
          ? t("driver_alerts.action_reconnect")
          : null;
  return (
    <div className='mt-1.5 flex items-center gap-2'>
      {href ? <span className='text-xs font-medium text-primary'>{href}</span> : null}
      {alert.action === "report" ? (
        <button
          type='button'
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onReport();
          }}
          className='text-xs font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded'
        >
          {t("driver_alerts.action_report")}
        </button>
      ) : null}
    </div>
  );
};

export default DriverAlertsPage;