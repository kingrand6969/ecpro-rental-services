import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Wrench, Calendar } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Car } from "@shared/schema";
import { useEffect } from "react";

const updateCarSchema = z.object({
  plateNumber: z.string().optional(),
  currentMileage: z.string().min(1, "Mileage is required"),
  lastOilChangeMileage: z.string().optional(),
  status: z.string().min(1, "Status is required"),
});

type UpdateCarFormData = z.infer<typeof updateCarSchema>;

interface CarDetailsDialogProps {
  car: Car | null;
  onClose: () => void;
}

export function CarDetailsDialog({ car, onClose }: CarDetailsDialogProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const form = useForm<UpdateCarFormData>({
    resolver: zodResolver(updateCarSchema),
    defaultValues: {
      plateNumber: "",
      currentMileage: "",
      lastOilChangeMileage: "",
      status: "available",
    },
  });

  useEffect(() => {
    if (car) {
      form.reset({
        plateNumber: car.plateNumber ?? "",
        currentMileage: car.currentMileage?.toString() ?? "0",
        lastOilChangeMileage: car.lastOilChangeMileage?.toString() ?? "0",
        status: car.status,
      });
    }
  }, [car, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateCarFormData) => {
      await apiRequest("PATCH", `/api/cars/${car?.id}`, {
        plateNumber: data.plateNumber,
        currentMileage: parseInt(data.currentMileage),
        lastOilChangeMileage: data.lastOilChangeMileage
          ? parseInt(data.lastOilChangeMileage)
          : undefined,
        status: data.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/edit-logs"] });
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

  const recordOilChangeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/cars/${car?.id}/oil-change`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/edit-logs"] });
      toast({
        title: "Success",
        description: "Oil change recorded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record oil change",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateCarFormData) => {
    updateMutation.mutate(data);
  };

  if (!car) return null;

  const needsOilChange = (car.currentMileage ?? 0) - (car.lastOilChangeMileage ?? 0) >=
    (car.oilChangeIntervalKm ?? 5000);

  const mileageSinceOilChange = (car.currentMileage ?? 0) - (car.lastOilChangeMileage ?? 0);
  const mileageUntilOilChange = Math.max(0, (car.oilChangeIntervalKm ?? 5000) - mileageSinceOilChange);

  return (
    <Dialog open={!!car} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: car.colorCode }}
            />
            <DialogTitle>{car.name}</DialogTitle>
          </div>
          <DialogDescription>{car.model} - {car.plateNumber}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-md bg-muted">
              <p className="text-sm text-muted-foreground">Monthly Payment</p>
              <p className="text-lg font-semibold">
                ₱{parseFloat(car.monthlyPayment).toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-md bg-muted">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className="mt-1">
                {car.status.charAt(0).toUpperCase() + car.status.slice(1)}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Maintenance Info
            </h4>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Current Mileage</p>
                <p className="font-medium">{(car.currentMileage ?? 0).toLocaleString()} km</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Oil Change</p>
                <p className="font-medium">{(car.lastOilChangeMileage ?? 0).toLocaleString()} km</p>
              </div>
              <div>
                <p className="text-muted-foreground">Oil Change Interval</p>
                <p className="font-medium">{(car.oilChangeIntervalKm ?? 5000).toLocaleString()} km</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Maintenance</p>
                <p className="font-medium">
                  {car.lastMaintenanceDate
                    ? format(parseISO(car.lastMaintenanceDate as string), "MMM d, yyyy")
                    : "Not recorded"}
                </p>
              </div>
            </div>

            {needsOilChange ? (
              <div className="flex items-center gap-2 p-3 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Oil Change Due!</span>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={() => recordOilChangeMutation.mutate()}
                    disabled={recordOilChangeMutation.isPending}
                    data-testid="button-record-oil-change"
                  >
                    Record Oil Change
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Next oil change in {mileageUntilOilChange.toLocaleString()} km
              </div>
            )}
          </div>

          <Separator />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <h4 className="font-medium">Update Car Information</h4>

              <FormField
                control={form.control}
                name="plateNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plate Number</FormLabel>
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
                name="currentMileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Mileage (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        data-testid="input-update-mileage"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isAdmin && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status (Admin Only)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-car-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="rented">Rented</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
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
