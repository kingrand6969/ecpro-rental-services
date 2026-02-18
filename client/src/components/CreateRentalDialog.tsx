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
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string | null>(null);

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
      const isReservation = !paymentScreenshotUrl;
      const payload = {
        carId: parseInt(data.carId),
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone || null,
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: format(data.endDate, "yyyy-MM-dd"),
        daysRented,
        totalAmount: data.totalAmount,
        paymentScreenshotUrl,
        paymentStatus: isReservation ? "pending" : "confirmed",
        notes: data.notes || null,
        isFinalized: false,
      };
      await apiRequest("POST", "/api/rentals", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      toast({
        title: "Success",
        description: "Rental booked successfully",
      });
      form.reset();
      setPaymentScreenshotUrl(null);
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
    createMutation.mutate(data);
  });

  const canProceedToDateSelection = !!selectedCarId;
  const canProceedToDetails = canProceedToDateSelection && startDate && endDate;

  const handleReset = () => {
    setStep("car");
    form.reset();
    setPaymentScreenshotUrl(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    handleReset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-booking-title">
            {step === "car" && "Select a Vehicle"}
            {step === "dates" && "Choose Rental Dates"}
            {step === "details" && "Complete Your Booking"}
          </DialogTitle>
          <DialogDescription>
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
                        ? "ring-2 ring-primary"
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
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: car.colorCode }}
                        />
                        <h3 className="font-medium text-sm truncate" data-testid={`text-car-name-${car.id}`}>
                          {car.name}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5" data-testid={`text-car-plate-${car.id}`}>
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
                <div className="bg-accent/50 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium" data-testid="text-selected-car-info">
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
                        <FormLabel>Start Date</FormLabel>
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
                        <FormLabel>End Date</FormLabel>
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
                  <div className="bg-primary/10 rounded-lg p-3">
                    <p className="text-sm font-medium" data-testid="text-days-count">
                      Total: {daysRented} day{daysRented !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Details and Payment */}
            {step === "details" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 bg-accent/50 rounded-lg p-3 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle</p>
                    <p className="text-sm font-medium" data-testid="text-detail-car-name">
                      {selectedCar?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm font-medium" data-testid="text-detail-days">
                      {daysRented} day{daysRented !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="text-sm font-medium" data-testid="text-detail-start-date">
                      {startDate ? format(startDate, "MMM d") : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">To</p>
                    <p className="text-sm font-medium" data-testid="text-detail-end-date">
                      {endDate ? format(endDate, "MMM d") : ""}
                    </p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
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
                        <FormLabel>Email</FormLabel>
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
                        <FormLabel>Phone</FormLabel>
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
                      <FormLabel>Total Rental Amount (₱)</FormLabel>
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
                      <FormLabel>Additional Notes</FormLabel>
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

                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Payment Screenshot</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Upload a screenshot to confirm payment. Without it, this booking will be saved as a reservation with pending payment.
                  </p>
                  <ObjectUploader
                    onGetUploadParameters={async () => {
                      const response = await apiRequest("POST", "/api/objects/upload", {});
                      const data = await response.json();
                      return { method: "PUT" as const, url: data.url };
                    }}
                    onComplete={(result) => {
                      if (result.successful[0]?.uploadURL) {
                        setPaymentScreenshotUrl(result.successful[0].uploadURL);
                      }
                    }}
                    data-testid="uploader-payment-screenshot"
                  >
                    Upload Payment Screenshot
                  </ObjectUploader>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (step === "dates") setStep("car");
                  else if (step === "details") setStep("dates");
                  else handleClose();
                }}
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
                  data-testid="button-complete-booking"
                >
                  {createMutation.isPending
                    ? "Booking..."
                    : paymentScreenshotUrl
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
