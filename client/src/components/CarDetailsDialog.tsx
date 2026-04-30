import { useMutation } from "@tanstack/react-query";
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
import { Wrench, Calendar, ImageIcon, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Car } from "@shared/schema";
import { useEffect, useState } from "react";

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
  lastOilChangeMileage: z.string().optional(),
  dateAcquired: z.string().optional(),
});

type UpdateCarFormData = z.infer<typeof updateCarSchema>;

interface CarDetailsDialogProps {
  car: Car | null;
  onClose: () => void;
}

export function CarDetailsDialog({ car, onClose }: CarDetailsDialogProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [registrationDate, setRegistrationDate] = useState("");

  const form = useForm<UpdateCarFormData>({
    resolver: zodResolver(updateCarSchema),
    defaultValues: {
      plateNumber: "",
      lastOilChangeMileage: "",
      dateAcquired: "",
    },
  });

  useEffect(() => {
    if (car) {
      form.reset({
        plateNumber: car.plateNumber ?? "",
        lastOilChangeMileage: car.lastOilChangeMileage?.toString() ?? "0",
        dateAcquired: car.dateAcquired ?? "",
      });
      setNewImageUrl(null);
      setRegistrationDate("");
    }
  }, [car, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateCarFormData) => {
      await apiRequest("PATCH", `/api/cars/${car?.id}`, {
        plateNumber: data.plateNumber,
        lastOilChangeMileage: data.lastOilChangeMileage
          ? parseInt(data.lastOilChangeMileage)
          : undefined,
        dateAcquired: data.dateAcquired || null,
        ...(newImageUrl && { imageUrl: newImageUrl }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/edit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
              {isAdmin && (
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

          {regStatus.status === "warning" && (
            <div className="p-3 rounded-md bg-orange-500/10 border border-orange-500/20" data-testid="warning-or-cr-upcoming">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                <span className="text-base font-bold text-orange-600 dark:text-orange-400">OR CR Due Soon</span>
              </div>
              <p className="text-sm text-orange-600 dark:text-orange-400 mb-2">
                Registration is due in {regStatus.daysUntilDue} day(s). Please prepare your documents.
              </p>
              {isAdmin && (
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
                  return { method: "PUT" as const, url: data.url };
                }}
                onComplete={(result) => {
                  if (result.successful[0]?.uploadURL) {
                    setNewImageUrl(result.successful[0].uploadURL);
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
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Oil Change Interval</p>
                <p className="font-medium tabular-nums mt-1">{(car.oilChangeIntervalKm ?? 5000).toLocaleString()} km</p>
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

          <Form {...form}>
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
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
