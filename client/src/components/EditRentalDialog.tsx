import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Car, Rental } from "@shared/schema";

const rentalSchema = z.object({
  carId: z.string().min(1, "Please select a car"),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  totalAmount: z.string().min(1, "Total amount is required"),
  notes: z.string().optional(),
  isFinalized: z.boolean(),
  paymentStatus: z.string(),
  paymentDate: z.string().optional(),
  paymentBank: z.string().optional(),
  reservationFee: z.string().optional(),
  reservationStatus: z.string(),
  reservationDate: z.string().optional(),
  reservationBank: z.string().optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
}).refine(
  (data) =>
    data.paymentStatus !== "confirmed" || !!data.paymentDate,
  { message: "Payment date is required when payment is confirmed", path: ["paymentDate"] },
).refine(
  (data) =>
    data.paymentStatus !== "confirmed" || !!data.paymentBank?.trim(),
  { message: "Bank is required when payment is confirmed", path: ["paymentBank"] },
).refine(
  (data) =>
    data.reservationStatus !== "confirmed" || !!data.reservationDate,
  { message: "Reservation date is required when reservation is confirmed", path: ["reservationDate"] },
).refine(
  (data) =>
    data.reservationStatus !== "confirmed" || !!data.reservationBank?.trim(),
  { message: "Bank is required when reservation is confirmed", path: ["reservationBank"] },
);

type RentalFormData = z.infer<typeof rentalSchema>;

interface EditRentalDialogProps {
  rental: Rental | null;
  onClose: () => void;
}

export function EditRentalDialog({ rental, onClose }: EditRentalDialogProps) {
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string | null>(null);
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
      isFinalized: false,
      paymentStatus: "pending",
      paymentDate: "",
      paymentBank: "",
      reservationFee: "",
      reservationStatus: "none",
      reservationDate: "",
      reservationBank: "",
    },
  });

  useEffect(() => {
    if (rental) {
      form.reset({
        carId: rental.carId.toString(),
        customerName: rental.customerName,
        customerEmail: rental.customerEmail ?? "",
        customerPhone: rental.customerPhone ?? "",
        startDate: parseISO(rental.startDate as string),
        endDate: parseISO(rental.endDate as string),
        totalAmount: rental.totalAmount,
        notes: rental.notes ?? "",
        isFinalized: rental.isFinalized,
        paymentStatus: rental.paymentStatus ?? "pending",
        paymentDate: rental.paymentDate
          ? (rental.paymentDate as unknown as string)
          : "",
        paymentBank: rental.paymentBank ?? "",
        reservationFee: rental.reservationFee ?? "",
        reservationStatus: rental.reservationStatus ?? "none",
        reservationDate: rental.reservationDate
          ? (rental.reservationDate as unknown as string)
          : "",
        reservationBank: rental.reservationBank ?? "",
      });
      setPaymentScreenshotUrl(rental.paymentScreenshotUrl ?? null);
      setReservationScreenshotUrl(rental.reservationScreenshotUrl ?? null);
    }
  }, [rental, form]);

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  const daysRented = startDate && endDate
    ? Math.max(1, differenceInDays(endDate, startDate))
    : 0;

  const updateMutation = useMutation({
    mutationFn: async (data: RentalFormData) => {
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
        notes: data.notes || null,
        isFinalized: data.isFinalized,
        paymentStatus: data.paymentStatus,
        paymentDate:
          data.paymentStatus === "confirmed" && data.paymentDate
            ? data.paymentDate
            : null,
        paymentBank:
          data.paymentStatus === "confirmed" && data.paymentBank?.trim()
            ? data.paymentBank.trim()
            : null,
        reservationFee:
          data.reservationFee && data.reservationFee.trim() !== ""
            ? data.reservationFee
            : null,
        reservationStatus: data.reservationStatus,
        reservationDate:
          data.reservationStatus === "confirmed" && data.reservationDate
            ? data.reservationDate
            : null,
        reservationBank:
          data.reservationStatus === "confirmed" && data.reservationBank?.trim()
            ? data.reservationBank.trim()
            : null,
        reservationScreenshotUrl,
      };
      await apiRequest("PATCH", `/api/rentals/${rental?.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/income-trend"] });
      toast({
        title: "Success",
        description: "Rental updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update rental",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/rentals/${rental?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/income-trend"] });
      toast({
        title: "Success",
        description: "Rental deleted successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete rental",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
      objectPath: data.objectPath,
    };
  };

  const handleUploadCompleteFor = (target: "payment" | "reservation") =>
    async (result: {
      successful: Array<{ uploadURL?: string; objectPath?: string }>;
    }) => {
      if (result.successful && result.successful.length > 0) {
        const uploaded = result.successful[0];
        let objectPath = uploaded.objectPath;
        if (!objectPath && uploaded.uploadURL) {
          const response = await apiRequest("PUT", "/api/payment-screenshots", {
            screenshotURL: uploaded.uploadURL,
          });
          const data = await response.json();
          objectPath = data.objectPath;
        }
        if (objectPath) {
          if (target === "reservation") {
            setReservationScreenshotUrl(objectPath);
          } else {
            setPaymentScreenshotUrl(objectPath);
          }
          toast({
            title: "Upload Complete",
            description:
              target === "reservation"
                ? "Reservation screenshot uploaded successfully"
                : "Payment screenshot uploaded successfully",
          });
        }
      }
    };

  const onSubmit = (data: RentalFormData) => {
    updateMutation.mutate(data);
  };

  if (!rental) return null;

  return (
    <Dialog open={!!rental} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-base uppercase tracking-widest">Edit Rental</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Admin can edit finalized rentals. Be careful when making changes.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="carId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Car</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-car">
                        <SelectValue placeholder="Select a car" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cars?.map((car) => (
                        <SelectItem key={car.id} value={car.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: car.colorCode }}
                            />
                            {car.name} - {car.plateNumber}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Customer Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-edit-customer-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Phone</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-edit-customer-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
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
                  <FormItem className="flex flex-col">
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => startDate && date < startDate}
                          initialFocus
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
                <span className="font-mono text-xs uppercase tracking-widest text-neon-magenta tabular-nums"><span className="font-bold">{daysRented}</span> day{daysRented > 1 ? "s" : ""} rental</span>
              </div>
            )}

            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Total Amount Paid (₱)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                      data-testid="input-edit-total-amount"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Payment Screenshot</FormLabel>
              <div className="mt-2">
                {paymentScreenshotUrl ? (
                  <div className="space-y-2">
                    <img
                      src={paymentScreenshotUrl}
                      alt="Payment screenshot"
                      className="max-h-32 rounded-md border object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPaymentScreenshotUrl(null)}
                    >
                      Remove Screenshot
                    </Button>
                  </div>
                ) : (
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadCompleteFor("payment")}
                    buttonClassName="w-full"
                  >
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      <span>Upload Payment Screenshot</span>
                    </div>
                  </ObjectUploader>
                )}
              </div>
            </div>

            <div className="rounded-md border border-neon-magenta/30 bg-neon-magenta/5 p-3 space-y-3">
              <p className="font-mono text-[11px] uppercase tracking-widest text-neon-magenta">Reservation Payment</p>

              <FormField
                control={form.control}
                name="reservationFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Reservation Amount (₱)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00 (leave empty if no reservation)"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e);
                          if (!e.target.value || parseFloat(e.target.value) <= 0) {
                            form.setValue("reservationStatus", "none");
                          } else if (form.getValues("reservationStatus") === "none") {
                            form.setValue("reservationStatus", "pending");
                          }
                        }}
                        data-testid="input-edit-reservation-fee"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!!form.watch("reservationFee") && parseFloat(form.watch("reservationFee") || "0") > 0 && (
                <>
                  <FormField
                    control={form.control}
                    name="reservationStatus"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Reservation Status</FormLabel>
                          <p className="text-sm text-muted-foreground mt-1">
                            {field.value === "confirmed" ? "Reservation confirmed" : "Reservation pending"}
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value === "confirmed"}
                            onCheckedChange={(checked) => field.onChange(checked ? "confirmed" : "pending")}
                            data-testid="switch-reservation-status"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("reservationStatus") === "confirmed" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="reservationDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Reservation Date</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                max={format(new Date(), "yyyy-MM-dd")}
                                data-testid="input-edit-reservation-date"
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
                            <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Bank / E-Wallet</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="e.g. BPI, BDO, GCash, Maya"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                data-testid="input-edit-reservation-bank"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div>
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Reservation Screenshot</FormLabel>
                    <div className="mt-2">
                      {reservationScreenshotUrl ? (
                        <div className="space-y-2">
                          <img
                            src={reservationScreenshotUrl}
                            alt="Reservation screenshot"
                            className="max-h-32 rounded-md border object-cover"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setReservationScreenshotUrl(null)}
                          >
                            Remove Screenshot
                          </Button>
                        </div>
                      ) : (
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={10485760}
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handleUploadCompleteFor("reservation")}
                          buttonClassName="w-full"
                        >
                          <div className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            <span>Upload Reservation Screenshot</span>
                          </div>
                        </ObjectUploader>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} data-testid="input-edit-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isSuperAdmin ? (
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Total Payment Status</FormLabel>
                      <p className="text-sm text-muted-foreground mt-1">
                        {field.value === "confirmed" ? "Payment confirmed - included in finances" : "Pending - not counted in finances"}
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === "confirmed"}
                        onCheckedChange={(checked) => field.onChange(checked ? "confirmed" : "pending")}
                        data-testid="switch-payment-status"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : (
              <div className="rounded-md border border-dashed p-3">
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Total Payment: {rental.paymentStatus === "confirmed" ? "Confirmed" : "Pending"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Only the Admin user can change the total payment status.
                </p>
              </div>
            )}

            {form.watch("paymentStatus") === "confirmed" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Payment Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          max={format(new Date(), "yyyy-MM-dd")}
                          data-testid="input-edit-payment-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentBank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Bank / E-Wallet</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="e.g. BPI, BDO, GCash, Maya"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          data-testid="input-edit-payment-bank"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {isSuperAdmin ? (
              <FormField
                control={form.control}
                name="isFinalized"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Finalized</FormLabel>
                      <p className="text-sm text-muted-foreground mt-1">
                        Finalized rentals cannot be edited by regular users
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-finalized"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : (
              <div className="rounded-md border border-dashed p-3">
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Finalized: {rental.isFinalized ? "Yes" : "No"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Only the Admin user can change the finalized state.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    className="font-mono text-xs uppercase tracking-wider"
                    data-testid="button-delete-rental"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this rental?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {rental.customerName} ·{" "}
                      ₱{parseFloat(rental.totalAmount).toLocaleString()}. This
                      permanently removes the rental and its payment records.
                      It cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      data-testid="button-confirm-delete-rental"
                    >
                      Delete rental
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="font-mono text-xs uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
                data-testid="button-save-rental"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
