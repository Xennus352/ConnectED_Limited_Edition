import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/tools";

const INCIDENT_TYPES = [
  "ACCIDENT",
  "MEDICAL",
  "BREAKDOWN",
  "ROUTE_DEVIATION",
  "SECURITY",
  "GPS_FAILURE",
  "OTHER",
];
const INCIDENT_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

interface IncidentReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportIncident: {
    isPending: boolean;
    mutateAsync: (body: object) => Promise<unknown>;
  };
}

/** Driver incident reporter — posts to the real `/driver/incidents` endpoint. */
export const IncidentReportDialog: React.FC<IncidentReportProps> = ({
  open,
  onOpenChange,
  reportIncident,
}) => {
  const { t } = useTranslation();
  const [type, setType] = React.useState("OTHER");
  const [severity, setSeverity] = React.useState("MEDIUM");
  const [description, setDescription] = React.useState("");

  const close = () => {
    onOpenChange(false);
    setDescription("");
  };

  const submit = async () => {
    await reportIncident.mutateAsync({ type, severity, description });
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <AlertTriangle className='h-4 w-4 text-amber-500' />
            {t("driver_trips.report_incident")}
          </DialogTitle>
          <DialogDescription>{t("driver_trips.incident_description")}</DialogDescription>
        </DialogHeader>

        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <div>
            <Label htmlFor='driver-incident-type'>{t("driver_incident.type")}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id='driver-incident-type' className='mt-1.5 h-9'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_TYPES.map((item) => (
                  <SelectItem key={item} value={item} className='capitalize'>
                    {item.toLowerCase().replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor='driver-incident-severity'>{t("driver_incident.severity")}</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger id='driver-incident-severity' className='mt-1.5 h-9'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_SEVERITIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor='driver-incident-details'>{t("driver_trips.incident_details")}</Label>
          <Input
            id='driver-incident-details'
            value={description}
            placeholder={t("driver_trips.enter_incident_details")}
            onChange={(event) => setDescription(event.target.value)}
            className='mt-1.5'
          />
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={close}>
            {t("button.cancel")}
          </Button>
          <Button className='gap-1.5' variant='secondary' onClick={() => void submit()} disabled={reportIncident.isPending}>
            {reportIncident.isPending ? (
              <LoadingSpinner />
            ) : (
              <AlertTriangle className='h-4 w-4' />
            )}
            {t("driver_trips.submit_incident")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IncidentReportDialog;