import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, differenceInMonths, addMonths, differenceInDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Wrench, Calendar, ImageIcon, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ObjectUploader } from "@/components/ObjectUploader";
import { getOilChangeStatus, formatDaysAge, DEFAULT_OIL_INTERVAL_DAYS } from "@/lib/oilChange";
import type { AffectedRental, Car } from "@shared/schema";
import { useEffect, useState } from "react";
import { MaintenanceStatusDialog } from "@/components/MaintenanceStatusDialog";
import { SwitchCarDialog } from "@/components/SwitchCarDialog";

export type RegistrationStatus = "ok" | "warning" | "overdue";

export function getRegistrationStatus(car: Car): { status: RegistrationStatus; daysUntilDue?: number } {
  if (!car.dateAcquired) return { status: "ok" };

  const now = new Date();
  const toDate = (val: unknown): Date => {
    if (val instanceof Date) return val;
    return parseISO(String(val));
  };

  const registrationConfirmed = car.registrationConfirmedAt
    ? toDate(car.registrationConfirmedAt)
    : null;
  const dateAcquired = toDate(car.dateAcquired);

  let dueDate: Date;
  if (registrationConfirmed) {
    dueDate = addMonths(registrationConfirmed, 12);
  } else {
    dueDate = addMonths(dateAcquired, 36);
  }

  const daysUntilDue = differenceInDays(dueDate, now);

  if (daysUntilDue <= 0) {
    return { status: "overdue", daysUntilDue };
  } else if (daysUntilDue <= 7) {
    return { status: "warning", daysUntilDue };
  }
  return { status: "ok", daysUntilDue };
}

export function needsRegistrationUpdate(car: Car): boolean {
  const { status } = getRegistrationStatus(car);
  return status === "overdue" || status === "warning";
}

const updateCarSchema = z.object({
  plateNumber: z.string().optional(),
  monthlyPayment: z.string().refine(
    (value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
    "Enter a valid non-negative amount",
  ).optional(),
  downPayment: z.string().refine(
    (value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
    "Enter a valid non-negative amount",
  ).optional(),
  lastOilChangeMileage: z.string().optional(),
  oilChangeIntervalKm: z.string().optional(),
  oilChangeIntervalDays: z.string().optional(),
  dateAcquired: z.string().optional(),
});

type UpdateCarFormData = z.infer<typeof updateCarSchema>;

interface CarDetailsDialogProps {
  car: Car | null;
  onClose: () => void;
  onMaintenanceChanged?: (car: Car) => void;
  onSwitchCar?: (rental: AffectedRental) => void;
}

export function CarDetailsDialog({
  car,
  onClose,
  onMaintenanceChanged,
  onSwitchCar,
}: CarDetailsDialogProps) {
  const { toast } = useToast();
  const { isAdmin, canManage } = useAuth();
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [registrationDate, setRegistrationDate] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState<"maintenance" | "available" | null>(null);
  const [switchRental, setSwitchRental] = useState<AffectedRental | null>(null);

  const {
    data: affectedRentals = [],
    isLoading: affectedRentalsLoading,
    isError: affectedRentalsError,
    refetch: refetchAffectedRentals,
  } = useQuery<AffectedRental[]>({
    queryKey: [`/api/cars/${car?.id}/affected-rentals`],
    enabled: Boolean(canManage && car?.id && car.status === "maintenance"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const form = useForm<UpdateCarFormData>({
    resolver: zodResolver(updateCarSchema),
    defaultValues: {
      plateNumber: "",
      monthlyPayment: "",
      downPayment: "",
      lastOilChangeMileage: "",
      oilChangeIntervalKm: "",
      oilChangeIntervalDays: "",
      dateAcquired: "",
    },
  });

  useEffect(() => {
    if (car) {
      form.reset({
        plateNumber: car.plateNumber ?? "",
        monthlyPayment: car.monthlyPayment ?? "",
        downPayment: car.downPayment ?? "0",
        lastOilChangeMileage: car.lastOilChangeMileage?.toString() ?? "0",
        oilChangeIntervalKm: (car.oilChangeIntervalKm ?? 5000).toString(),
        oilChangeIntervalDays: (car.oilChangeIntervalDays ?? DEFAULT_OIL_INTERVAL_DAYS).toString(),
        dateAcquired: car.dateAcquired ?? "",
      });
      setNewImageUrl(null);
      setRegistrationDate("");
      setMaintenanceMode(null);
      setSwitchRental(null);
    }
  }, [car, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateCarFormData) => {
      await apiRequest("PATCH", `/api/cars/${car?.id}`, {
        plateNumber: data.plateNumber,
        lastOilChangeMileage: data.lastOilChangeMileage
          ? parseInt(data.lastOilChangeMileage)
          : undefined,
        oilChangeIntervalKm: data.oilChangeIntervalKm
          ? parseInt(data.oilChangeIntervalKm)
          : undefined,
        oilChangeIntervalDays: data.oilChangeIntervalDays
          ? parseInt(data.oilChangeIntervalDays)
          : undefined,
        dateAcquired: data.dateAcquired || null,
        ...(isAdmin && { monthlyPayment: data.monthlyPayment }),
        ...(isAdmin && { downPayment: data.downPayment }),
        ...(newImageUrl && { imageUrl: newImageUrl }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/edit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/income-trend"] });
      toast({
        title: "Success",
        description: "Car updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update car",
        variant: "destructive",
      });
    },
  });

  const confirmRegistrationMutation = useMutation({
    mutationFn: async (date: string) => {
      await apiRequest("POST", `/api/cars/${car?.id}/confirm-registration`, { registrationDate: date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/edit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/income-trend"] });
      toast({
        title: "Success",
        description: "Registration confirmed successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to confirm registration",
        variant: "destructive",
      });
    },
  });

  
  const onSubmit = (data: UpdateCarFormData) => {
    updateMutation.mutate(data);
  };

  if (!car) return null;

  const regStatus = getRegistrationStatus(car);
  const showOrCrWarning = regStatus.status === "overdue" || regStatus.status === "warning";
  const oilStatus = getOilChangeStatus(car);

  const handleConfirmRegistration = () => {
    if (!registrationDate) {
      toast({
        title: "Date Required",
        description: "Please enter the last car registration date",
        variant: "destructive",
      });
      return;
    }
    confirmRegistrationMutation.mutate(registrationDate);
  };

  const handleSwitchCar = (rental: AffectedRental) => {
    if (!canManage) return;
    if (onSwitchCar) {
      onSwitchCar(rental);
      return;
    }
    setSwitchRental(rental);
  };

  return (
    <Dialog open={!!car} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]"
              style={{ backgroundColor: car.colorCode, color: car.colorCode }}
            />
            <DialogTitle className="font-mono text-base uppercase tracking-widest">{car.name}</DialogTitle>
          </div>
          <DialogDescription className="font-mono text-xs">
            {car.brand && `${car.brand} `}{car.model} • {car.plateNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {regStatus.status === "overdue" && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20" data-testid="warning-or-cr">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span className="text-base font-bold text-red-600 dark:text-red-400">OR CR Needs Update</span>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                Registration is overdue by {Math.abs(regStatus.daysUntilDue ?? 0)} day(s).
              </p>
              {canManage && (
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="date"
                    value={registrationDate}
                    onChange={(e) => setRegistrationDate(e.target.value)}
                    className="flex-1"
                    data-testid="input-registration-date"
                  />
                  <Button
                    size="sm"
                    onClick={handleConfirmRegistration}
                    disabled={confirmRegistrationMutation.isPending}
                    data-testid="button-confirm-registration"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {confirmRegistrationMutation.isPending ? "Saving..." : "Confirm"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {oilStatus.due && (
            <div
              className="p-3 rounded-md bg-neon-magenta/10 border border-neon-magenta/30"
              data-testid="warning-oil-change"
            >
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-5 w-5 text-neon-magenta flex-shrink-0" />
                <span className="text-base font-bold text-neon-magenta">Oil Change Due</span>
              </div>
              <p className="text-sm text-neon-magenta">
                {oilStatus.reasonKm && (
                  <>
                    {oilStatus.kmSince.toLocaleString()} km since last change
                    {oilStatus.kmOverBy > 0 && ` (${oilStatus.kmOverBy.toLocaleString()} km overdue)`}
                  </>
                )}
                {oilStatus.reasonKm && oilStatus.reasonTime && oilStatus.daysSince != null && " · "}
                {oilStatus.reasonTime && oilStatus.daysSince != null && (
                  <>
                    {formatDaysAge(oilStatus.daysSince)} since last change
                    {oilStatus.daysOverBy != null && oilStatus.daysOverBy > 0 &&
                      ` (${formatDaysAge(oilStatus.daysOverBy)} overdue)`}
                  </>
                )}
              </p>
            </div>
          )}

          {regStatus.status === "warning" && (
            <div className="p-3 rounded-md bg-orange-500/10 border border-orange-500/20" data-testid="warning-or-cr-upcoming">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                <span className="text-base font-bold text-orange-600 dark:text-orange-400">OR CR Due Soon</span>
              </div>
              <p className="text-sm text-orange-600 dark:text-orange-400 mb-2">
                Registration is due in {regStatus.daysUntilDue} day(s). Please prepare your documents.
              </p>
              {canManage && (
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="date"
                    value={registrationDate}
                    onChange={(e) => setRegistrationDate(e.target.value)}
                    className="flex-1"
                    data-testid="input-registration-date"
                  />
                  <Button
                    size="sm"
                    onClick={handleConfirmRegistration}
                    disabled={confirmRegistrationMutation.isPending}
                    data-testid="button-confirm-registration"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {confirmRegistrationMutation.isPending ? "Saving..." : "Confirm"}
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="aspect-video bg-muted rounded-md overflow-hidden">
              {newImageUrl || car.imageUrl ? (
                <img
                  src={newImageUrl || car.imageUrl || ""}
                  alt={car.name}
                  className="w-full h-full object-cover"
                  data-testid="img-car-detail"
                />
              ) : (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ObjectUploader
                onGetUploadParameters={async () => {
                  const response = await apiRequest("POST", "/api/objects/upload", {});
                  const data = await response.json();
                  return { method: "PUT" as const, url: data.uploadURL, objectPath: data.objectPath };
                }}
                onComplete={(result) => {
                  const uploaded = result.successful[0];
                  if (uploaded?.objectPath || uploaded?.uploadURL) {
                    setNewImageUrl(uploaded.objectPath ?? uploaded.uploadURL!);
                    toast({
                      title: "Image Ready",
                      description: "Click Update to save the new picture",
                    });
                  }
                }}
                data-testid="uploader-car-image"
              >
                Change Picture
              </ObjectUploader>
              {newImageUrl && (
                <span className="text-xs text-green-600">New image selected</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border bg-card p-3">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Monthly Payment</p>
              <p className="text-lg font-bold tabular-nums text-neon-cyan mt-1">
                ₱{parseFloat(car.monthlyPayment).toLocaleString()}
              </p>
            </div>
            <div className="rounded-md border border-border bg-card p-3">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Status</p>
              <Badge
                variant="outline"
                className={`mt-2 font-mono text-[10px] uppercase tracking-widest ${
                  car.status === "available"
                    ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                    : car.status === "rented"
                    ? "border-neon-magenta/40 bg-neon-magenta/10 text-neon-magenta"
                    : "border-chart-4/40 bg-chart-4/10 text-chart-4"
                }`}
              >
                {car.status}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {car.dateAcquired && (
              <div className="rounded-md border border-border bg-card p-3">
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Date Acquired</p>
                <p className="font-medium mt-1">
                  {format(parseISO(car.dateAcquired as string), "MMMM d, yyyy")}
                </p>
              </div>
            )}
            <div className="rounded-md border border-border bg-card p-3">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Last Car Registration</p>
              <p className="font-medium mt-1">
                {car.registrationConfirmedAt
                  ? format(parseISO(car.registrationConfirmedAt as string), "MMMM d, yyyy")
                  : "Not recorded"}
              </p>
            </div>
          </div>

          <Separator />

          <section className="space-y-3" aria-labelledby="maintenance-status-heading">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4
                  id="maintenance-status-heading"
                  className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Maintenance Status
                </h4>
                {car.status === "maintenance" ? (
                  <Badge className="mt-2 border border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    <Wrench className="mr-1.5 h-3.5 w-3.5" />
                    Under Maintenance
                  </Badge>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">No active maintenance hold.</p>
                )}
              </div>
              {canManage && (
                <Button
                  type="button"
                  variant={car.status === "maintenance" ? "default" : "outline"}
                  className="min-h-11 w-full sm:w-auto"
                  onClick={() =>
                    setMaintenanceMode(car.status === "maintenance" ? "available" : "maintenance")
                  }
                  data-testid="button-maintenance-status"
                >
                  {car.status === "maintenance" ? "Return to Available" : "Mark Under Maintenance"}
                </Button>
              )}
            </div>

            {car.status === "maintenance" && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">
                  Reason
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                  {car.maintenanceReason || "No reason recorded."}
                </p>
              </div>
            )}
          </section>

          {canManage && car.status === "maintenance" && (
            <>
              <Separator />
              <section className="space-y-3" aria-labelledby="affected-rentals-heading">
                <div>
                  <h4
                    id="affected-rentals-heading"
                    className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Affected Rentals
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Active and upcoming rentals assigned to this car.
                  </p>
                </div>

                {affectedRentalsLoading ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    Loading affected rentals...
                  </p>
                ) : affectedRentalsError ? (
                  <div className="rounded-md border border-destructive/30 p-3" role="alert">
                    <p className="text-sm text-destructive">Affected rentals could not be loaded.</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 min-h-11"
                      onClick={() => refetchAffectedRentals()}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </Button>
                  </div>
                ) : affectedRentals.length === 0 ? (
                  <p className="rounded-md border border-border p-3 text-sm text-muted-foreground">
                    No active or upcoming rentals are affected.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {affectedRentals.map((rental) => (
                      <article
                        key={rental.id}
                        className="rounded-md border border-border bg-card p-3"
                        data-testid={`affected-rental-${rental.id}`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 space-y-1">
                            <p className="break-words font-medium">{rental.customerName}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(rental.startDate), "MMM d, yyyy")} –{" "}
                              {format(parseISO(rental.endDate), "MMM d, yyyy")}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <Badge variant="outline">
                                Payment: {rental.paymentStatus}
                              </Badge>
                              <span className="font-mono tabular-nums">
                                ₱{Number(rental.totalAmount).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          {canManage && (
                            <Button
                              type="button"
                              variant="outline"
                              className="min-h-11 w-full shrink-0 sm:w-auto"
                              onClick={() => handleSwitchCar(rental)}
                              title={`Switch the car for ${rental.customerName}`}
                              data-testid={`button-switch-car-${rental.id}`}
                            >
                              Switch Car
                            </Button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          <Separator />

          <div className="space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-neon-cyan" />
              Maintenance Info
            </h4>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Last Oil Change Mileage</p>
                <p className="font-medium tabular-nums mt-1">{(car.lastOilChangeMileage ?? 0).toLocaleString()} km</p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Oil Change Interval (km)</p>
                <p className="font-medium tabular-nums mt-1">{(car.oilChangeIntervalKm ?? 5000).toLocaleString()} km</p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Oil Change Interval (time)</p>
                <p className="font-medium tabular-nums mt-1">
                  {(car.oilChangeIntervalDays ?? DEFAULT_OIL_INTERVAL_DAYS).toLocaleString()} days
                </p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Last Maintenance</p>
                <p className="font-medium mt-1">
                  {car.lastMaintenanceDate
                    ? format(parseISO(car.lastMaintenanceDate as string), "MMM d, yyyy")
                    : "Not recorded"}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {canManage && <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Update Car Information</h4>

              <FormField
                control={form.control}
                name="plateNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Plate Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="input-plate-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateAcquired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Date Acquired</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-date-acquired"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isAdmin && (
                <div className="rounded-lg border border-neon-cyan/30 bg-neon-cyan/[0.06] p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Financing details can only be changed by admin accounts.
                    </p>
                    <Badge variant="outline" className="shrink-0 border-neon-cyan/40 text-neon-cyan">
                      Admin only
                    </Badge>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="monthlyPayment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-neon-cyan">
                            Monthly Amortization (₱)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              className="font-mono text-base tabular-nums"
                              {...field}
                              data-testid="input-monthly-amortization"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="downPayment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-neon-cyan">
                            Down Payment (₱)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              className="font-mono text-base tabular-nums"
                              {...field}
                              data-testid="input-down-payment"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="oilChangeIntervalKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                        Oil Interval (km)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          data-testid="input-oil-interval-km"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="oilChangeIntervalDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                        Oil Interval (days)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          data-testid="input-oil-interval-days"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 font-mono text-xs uppercase tracking-wider"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
                  disabled={updateMutation.isPending}
                  data-testid="button-update-car"
                >
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </form>
          </Form>}
        </div>
      </DialogContent>
      {maintenanceMode && (
        <MaintenanceStatusDialog
          car={car}
          mode={maintenanceMode}
          onClose={() => setMaintenanceMode(null)}
          onSuccess={(updatedCar) => {
            onMaintenanceChanged?.(updatedCar);
            onClose();
          }}
        />
      )}
      {switchRental && (
        <SwitchCarDialog
          rental={switchRental}
          currentCar={car}
          open
          onOpenChange={(open) => {
            if (!open) setSwitchRental(null);
          }}
        />
      )}
    </Dialog>
  );
}
