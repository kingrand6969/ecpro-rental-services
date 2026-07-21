import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInDays, addDays, parseISO } from "date-fns";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, ChevronRight, ChevronLeft, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { needsRegistrationUpdate, getRegistrationStatus } from "@/components/CarDetailsDialog";
import type { Car } from "@shared/schema";

const rentalSchema = z.object({
  carId: z.string().min(1, "Please select a car"),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  totalAmount: z.string().min(1, "Total amount is required"),
  notes: z.string().optional(),
  reservationFee: z.string().optional(),
  reservationDate: z.string().optional(),
  reservationBank: z.string().optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type RentalFormData = z.infer<typeof rentalSchema>;

interface CreateRentalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date | null;
}

export function CreateRentalDialog({
  open,
  onOpenChange,
  selectedDate,
}: CreateRentalDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"car" | "dates" | "details">("car");
  const [reservationScreenshotUrl, setReservationScreenshotUrl] = useState<string | null>(null);

  const { data: cars } = useQuery<Car[]>({
    queryKey: ["/api/cars"],
  });

  const form = useForm<RentalFormData>({
    resolver: zodResolver(rentalSchema),
    defaultValues: {
      carId: "",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      totalAmount: "",
      notes: "",
      reservationFee: "",
      reservationDate: format(new Date(), "yyyy-MM-dd"),
      reservationBank: "",
    },
  });

  useEffect(() => {
    if (selectedDate && step === "dates") {
      form.setValue("startDate", selectedDate);
      form.setValue("endDate", addDays(selectedDate, 1));
    }
  }, [selectedDate, form, step]);

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const selectedCarId = form.watch("carId");

  const daysRented = startDate && endDate
    ? Math.max(1, differenceInDays(endDate, startDate))
    : 0;

  const selectedCar = cars?.find((car) => car.id === parseInt(selectedCarId));

  const createMutation = useMutation({
    mutationFn: async (data: RentalFormData) => {
      const hasReservationFee = !!data.reservationFee && data.reservationFee.trim() !== "" && parseFloat(data.reservationFee) > 0;
      const reservationConfirmed = hasReservationFee && !!reservationScreenshotUrl && !!data.reservationDate && !!data.reservationBank?.trim();
      const reservationStatus = !hasReservationFee
        ? "none"
        : reservationConfirmed
          ? "confirmed"
          : "pending";
      const payload = {
        carId: parseInt(data.carId),
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone || null,
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: format(data.endDate, "yyyy-MM-dd"),
        daysRented,
        totalAmount: data.totalAmount,
        paymentScreenshotUrl: null,
        paymentStatus: "pending",
        paymentDate: null,
        paymentBank: null,
        reservationFee: hasReservationFee ? data.reservationFee : null,
        reservationStatus,
        reservationDate:
          reservationStatus === "confirmed" && data.reservationDate ? data.reservationDate : null,
        reservationBank:
          reservationStatus === "confirmed" && data.reservationBank?.trim()
            ? data.reservationBank.trim()
            : null,
        reservationScreenshotUrl: hasReservationFee ? reservationScreenshotUrl : null,
        notes: data.notes || null,
        isFinalized: false,
      };
      await apiRequest("POST", "/api/rentals", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/income-trend"] });
      toast({
        title: "Success",
        description: "Rental booked successfully",
      });
      form.reset();
      setReservationScreenshotUrl(null);
      setStep("car");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create rental",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    const hasReservationFee = !!data.reservationFee && data.reservationFee.trim() !== "" && parseFloat(data.reservationFee) > 0;
    if (hasReservationFee && reservationScreenshotUrl) {
      const errors: Record<string, { type: string; message: string }> = {};
      if (!data.reservationDate) {
        errors.reservationDate = { type: "required", message: "Reservation date is required" };
      }
      if (!data.reservationBank?.trim()) {
        errors.reservationBank = { type: "required", message: "Bank is required" };
      }
      if (Object.keys(errors).length > 0) {
        Object.entries(errors).forEach(([field, err]) => {
          form.setError(field as keyof RentalFormData, err);
        });
        return;
      }
    }
    createMutation.mutate(data);
  });

  const canProceedToDateSelection = !!selectedCarId;
  const canProceedToDetails = canProceedToDateSelection && startDate && endDate;

  const handleReset = () => {
    setStep("car");
    form.reset();
    setReservationScreenshotUrl(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    handleReset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-booking-title" className="font-mono text-base uppercase tracking-widest">
            {step === "car" && "Select a Vehicle"}
            {step === "dates" && "Choose Rental Dates"}
            {step === "details" && "Complete Your Booking"}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {step === "car" && "Choose the car you want to rent"}
            {step === "dates" && `Rental dates for ${selectedCar?.name}`}
            {step === "details" && "Enter customer details and payment information"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* STEP 1: Car Selection */}
            {step === "car" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-2">
                {cars?.map((car) => (
                  <Card
                    key={car.id}
                    className={`cursor-pointer transition-all hover-elevate ${
                      selectedCarId === car.id.toString()
                        ? "ring-2 ring-neon-cyan shadow-cyan-glow"
                        : ""
                    }`}
                    onClick={() => {
                      form.setValue("carId", car.id.toString());
                    }}
                    data-testid={`card-car-${car.id}`}
                  >
                    <CardContent className="p-2">
                      <div className="aspect-video bg-muted rounded-md mb-2 overflow-hidden">
                        {car.imageUrl ? (
                          <img
                            src={car.imageUrl}
                            alt={car.name}
                            className="w-full h-full object-cover"
                            data-testid={`img-car-${car.id}`}
                          />
                        ) : (
                          <div className="w-full h-full bg-black rounded-md" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-[0_0_6px_currentColor]"
                          style={{ backgroundColor: car.colorCode, color: car.colorCode }}
                        />
                        <h3 className="font-mono text-xs uppercase tracking-wider truncate" data-testid={`text-car-name-${car.id}`}>
                          {car.name}
                        </h3>
                      </div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate mt-0.5" data-testid={`text-car-plate-${car.id}`}>
                        {car.plateNumber}
                      </p>
                      {getRegistrationStatus(car).status === "overdue" && (
                        <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                          <span className="text-xs font-bold">OR CR Needs Update</span>
                        </div>
                      )}
                      {getRegistrationStatus(car).status === "warning" && (
                        <div className="flex items-center gap-1 mt-1 text-orange-600 dark:text-orange-400">
                          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                          <span className="text-xs font-bold">OR CR Due in {getRegistrationStatus(car).daysUntilDue} day(s)</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* STEP 2: Date Selection */}
            {step === "dates" && (
              <div className="space-y-4">
                <div className="rounded-md border border-neon-cyan/30 bg-neon-cyan/5 p-3 mb-4">
                  <p className="font-mono text-xs uppercase tracking-widest text-neon-cyan" data-testid="text-selected-car-info">
                    {selectedCar?.name} • {selectedCar?.model}
                  </p>
                  {selectedCar && getRegistrationStatus(selectedCar).status === "overdue" && (
                    <div className="flex items-center gap-1 mt-2 text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-xs font-bold">OR CR Needs Update</span>
                    </div>
                  )}
                  {selectedCar && getRegistrationStatus(selectedCar).status === "warning" && (
                    <div className="flex items-center gap-1 mt-2 text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-xs font-bold">OR CR Due in {getRegistrationStatus(selectedCar).daysUntilDue} day(s)</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                              data-testid="button-start-date"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "MMM d, yyyy") : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                              }}
                              captionLayout="dropdown-buttons"
                              fromYear={2020}
                              toYear={2030}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                              data-testid="button-end-date"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "MMM d, yyyy") : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                              }}
                              disabled={(date) =>
                                startDate ? date < startDate : false
                              }
                              captionLayout="dropdown-buttons"
                              fromYear={2020}
                              toYear={2030}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {daysRented > 0 && (
                  <div className="rounded-md border border-neon-magenta/30 bg-neon-magenta/5 p-3">
                    <p className="font-mono text-xs uppercase tracking-widest text-neon-magenta tabular-nums" data-testid="text-days-count">
                      Total: {daysRented} day{daysRented !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Details and Payment */}
            {step === "details" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-card p-3 mb-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Vehicle</p>
                    <p className="text-sm font-medium mt-1" data-testid="text-detail-car-name">
                      {selectedCar?.name}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Duration</p>
                    <p className="text-sm font-medium tabular-nums mt-1" data-testid="text-detail-days">
                      {daysRented} day{daysRented !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">From</p>
                    <p className="text-sm font-medium tabular-nums mt-1" data-testid="text-detail-start-date">
                      {startDate ? format(startDate, "MMM d") : ""}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">To</p>
                    <p className="text-sm font-medium tabular-nums mt-1" data-testid="text-detail-end-date">
                      {endDate ? format(endDate, "MMM d") : ""}
                    </p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Customer Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full name" data-testid="input-customer-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="email@example.com"
                            data-testid="input-customer-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Phone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Phone number" data-testid="input-customer-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Total Rental Amount (₱)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          data-testid="input-total-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Any special requests or notes..."
                          className="resize-none"
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t border-border pt-4 space-y-3">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Reservation Payment (optional)</p>
                  <p className="text-xs text-muted-foreground">
                    Enter a reservation amount if the customer is paying a deposit now. The Total Payment is confirmed later by the Admin.
                  </p>
                  <FormField
                    control={form.control}
                    name="reservationFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Reservation Amount (₱)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            placeholder="0.00 (leave empty if no reservation)"
                            data-testid="input-reservation-fee"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!!form.watch("reservationFee") && parseFloat(form.watch("reservationFee") || "0") > 0 && (
                    <>
                      <ObjectUploader
                        onGetUploadParameters={async () => {
                          const response = await apiRequest("POST", "/api/objects/upload", {});
                          const data = await response.json();
                          return { method: "PUT" as const, url: data.uploadURL, objectPath: data.objectPath };
                        }}
                        onComplete={(result) => {
                          const uploaded = result.successful[0];
                          if (uploaded?.objectPath || uploaded?.uploadURL) {
                            setReservationScreenshotUrl(uploaded.objectPath ?? uploaded.uploadURL!);
                          }
                        }}
                        data-testid="uploader-reservation-screenshot"
                      >
                        {reservationScreenshotUrl ? "Replace Reservation Screenshot" : "Upload Reservation Screenshot"}
                      </ObjectUploader>

                      {reservationScreenshotUrl && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="reservationDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                                  Reservation Date
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    max={format(new Date(), "yyyy-MM-dd")}
                                    data-testid="input-create-reservation-date"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="reservationBank"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                                  Bank / E-Wallet
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="text"
                                    placeholder="e.g. BPI, BDO, GCash, Maya"
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    data-testid="input-create-reservation-bank"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (step === "dates") setStep("car");
                  else if (step === "details") setStep("dates");
                  else handleClose();
                }}
                className="font-mono text-xs uppercase tracking-wider"
                data-testid={`button-${step === "car" ? "close" : "back"}`}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                {step === "car" ? "Cancel" : "Back"}
              </Button>

              {step !== "details" && (
                <Button
                  type="button"
                  onClick={() => {
                    if (step === "car" && canProceedToDateSelection) {
                      setStep("dates");
                    } else if (step === "dates" && canProceedToDetails) {
                      setStep("details");
                    }
                  }}
                  disabled={
                    (step === "car" && !canProceedToDateSelection) ||
                    (step === "dates" && !canProceedToDetails)
                  }
                  className="font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
                  data-testid="button-next-step"
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}

              {step === "details" && (
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
                  data-testid="button-complete-booking"
                >
                  {createMutation.isPending
                    ? "Booking..."
                    : reservationScreenshotUrl
                      ? "Complete Booking"
                      : "Save as Reservation"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
