import { z } from "zod";
import { useTranslation } from "react-i18next";

/**
 * Client-side validation for the transport-management forms. The server
 * remains the source of truth for lifecycle rules (trip state machine,
 * maintenance workflow, bus archive-or-delete); these schemas only keep the
 * obvious required fields honest before the request leaves the browser.
 */
const useTransportValidation = () => {
  const { t } = useTranslation();

  const required = (key: string) =>
    z.string({ required_error: t(`transport_form.${key}_required`) }).min(1, {
      message: t(`transport_form.${key}_required`),
    });

  const optionalNumber = z.preprocess(
    (value) => (value === "" || value === null ? undefined : Number(value)),
    z.number({ invalid_type_error: "Must be a number" }).optional()
  );

  const requiredNumber = z.preprocess(
    (value) => (value === "" || value === null ? undefined : Number(value)),
    z
      .number({ invalid_type_error: "Must be a number" })
      .min(0, { message: "Must be a valid number" })
  );

  const validateBus = z.object({
    busNumber: required("bus_number"),
    registrationNumber: required("registration_number"),
    name: z.string(),
    capacity: requiredNumber,
    make: z.string(),
    model: z.string(),
    year: optionalNumber,
    color: z.string(),
    vehicleType: z.string(),
    fuelType: z.string(),
    fuelConsumption: optionalNumber,
    mileage: optionalNumber,
    purchasePrice: optionalNumber,
    insuranceProvider: z.string(),
    insurancePolicyNumber: z.string(),
    notes: z.string(),
    status: z.string(),
    driverId: z.string(),
    routeId: z.string(),
  });

  const validateRoute = z.object({
    name: required("route_name"),
    startLocation: required("start_location"),
    endLocation: required("end_location"),
    estimatedDuration: optionalNumber,
    description: z.string(),
    isActive: z.boolean(),
  });

  const validateTrip = z.object({
    tripType: z.string(),
    busId: required("bus"),
    driverId: required("driver"),
    routeId: required("route"),
    scheduledStartAt: z.any(),
    scheduledEndAt: z.any(),
    notes: z.string(),
  });

  const validateMaintenance = z.object({
    busId: required("bus"),
    type: required("type"),
    title: z.string(),
    priority: z.string(),
    severity: z.string(),
    blocksOperation: z.boolean(),
    date: z.string(),
    description: z.string(),
    mileage: optionalNumber,
  });

  const validateFuel = z.object({
    busId: required("bus"),
    driverId: required("driver"),
    date: z.string(),
    liters: requiredNumber,
    pricePerLiter: optionalNumber,
    totalCost: optionalNumber,
    station: z.string(),
    notes: z.string(),
  });

  const validateIncident = z.object({
    busId: required("bus"),
    driverId: required("driver"),
    tripId: z.string(),
    routeId: z.string(),
    type: z.string(),
    severity: z.string(),
    occurredAt: z.any(),
    description: z.string(),
  });

  return {
    validateBus,
    validateRoute,
    validateTrip,
    validateMaintenance,
    validateFuel,
    validateIncident,
  };
};

export default useTransportValidation;