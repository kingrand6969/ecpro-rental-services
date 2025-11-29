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
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type RentalFormData = z.infer<typeof rentalSchema>;

interface EditRentalDialogProps {
  rental: Rental | null;
  onClose: () => void;
}

export function EditRentalDialog({ rental, onClose }: EditRentalDialogProps) {
  const { toast } = useToast();
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
      isFinalized: false,
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
      });
      setPaymentScreenshotUrl(rental.paymentScreenshotUrl ?? null);
    }
  }, [rental, form]);

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  const daysRented = startDate && endDate
    ? Math.max(1, differenceInDays(endDate, startDate) + 1)
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
      };
      await apiRequest("PATCH", `/api/rentals/${rental?.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
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
    };
  };

  const handleUploadComplete = async (result: { successful: Array<{ uploadURL?: string }> }) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedUrl = result.successful[0].uploadURL;
      if (uploadedUrl) {
        const response = await apiRequest("PUT", "/api/payment-screenshots", {
          screenshotURL: uploadedUrl,
        });
        const data = await response.json();
        setPaymentScreenshotUrl(data.objectPath);
        toast({
          title: "Upload Complete",
          description: "Payment screenshot uploaded successfully",
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
          <DialogTitle>Edit Rental</DialogTitle>
          <DialogDescription>
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
                  <FormLabel>Car</FormLabel>
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
                    <FormLabel>Customer Name</FormLabel>
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
                    <FormLabel>Email</FormLabel>
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
                  <FormLabel>Phone</FormLabel>
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
                    <FormLabel>Start Date</FormLabel>
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
                    <FormLabel>End Date</FormLabel>
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
              <div className="p-3 rounded-md bg-muted text-sm">
                <span className="font-medium">{daysRented}</span> day{daysRented > 1 ? "s" : ""} rental
              </div>
            )}

            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Amount Paid ($)</FormLabel>
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
              <FormLabel>Payment Screenshot</FormLabel>
              <div className="mt-2">
                {paymentScreenshotUrl ? (
                  <div className="space-y-2">
                    <img
                      src={paymentScreenshotUrl.startsWith("/objects/")
                        ? paymentScreenshotUrl
                        : paymentScreenshotUrl}
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
                    onComplete={handleUploadComplete}
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} data-testid="input-edit-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isFinalized"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <FormLabel>Finalized</FormLabel>
                    <p className="text-sm text-muted-foreground">
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

            <div className="flex items-center gap-3 pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                data-testid="button-delete-rental"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
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
