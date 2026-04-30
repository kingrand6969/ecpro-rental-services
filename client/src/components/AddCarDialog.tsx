import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CAR_COLORS = [
  { name: "Blue", code: "#3B82F6" },
  { name: "Green", code: "#22C55E" },
  { name: "Purple", code: "#A855F7" },
  { name: "Orange", code: "#F97316" },
  { name: "Pink", code: "#EC4899" },
  { name: "Teal", code: "#14B8A6" },
  { name: "Indigo", code: "#6366F1" },
  { name: "Amber", code: "#F59E0B" },
];

const carSchema = z.object({
  name: z.string().min(1, "Car name is required"),
  model: z.string().min(1, "Model is required"),
  plateNumber: z.string().min(1, "Plate number is required"),
  color: z.string().min(1, "Color is required"),
  colorCode: z.string().min(1, "Calendar color is required"),
  monthlyPayment: z.string().min(1, "Monthly payment is required"),
  oilChangeIntervalKm: z.string().optional(),
  dateAcquired: z.string().optional(),
});

type CarFormData = z.infer<typeof carSchema>;

interface AddCarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCarDialog({ open, onOpenChange }: AddCarDialogProps) {
  const { toast } = useToast();

  const form = useForm<CarFormData>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      name: "",
      model: "",
      plateNumber: "",
      color: "",
      colorCode: CAR_COLORS[0].code,
      monthlyPayment: "",
      oilChangeIntervalKm: "5000",
      dateAcquired: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CarFormData) => {
      const payload = {
        name: data.name,
        model: data.model,
        plateNumber: data.plateNumber,
        color: data.color,
        colorCode: data.colorCode,
        monthlyPayment: data.monthlyPayment,
        currentMileage: 0,
        lastOilChangeMileage: 0,
        oilChangeIntervalKm: parseInt(data.oilChangeIntervalKm || "5000"),
        status: "available",
        dateAcquired: data.dateAcquired || null,
      };
      await apiRequest("POST", "/api/cars", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Car added successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add car",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CarFormData) => {
    createMutation.mutate(data);
  };

  const selectedColorCode = form.watch("colorCode");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-base uppercase tracking-widest">Add New Car</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Add a new car to your fleet. This will be available for rentals.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Car Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Toyota Camry 2023"
                      {...field}
                      data-testid="input-car-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Model</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Camry XLE"
                      {...field}
                      data-testid="input-car-model"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="plateNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Plate Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ABC-1234"
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
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Car Color</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Silver"
                        {...field}
                        data-testid="input-car-color"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="colorCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Calendar Color</FormLabel>
                  <FormDescription>
                    This color will be used to identify this car on the calendar
                  </FormDescription>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CAR_COLORS.map((color) => (
                      <button
                        key={color.code}
                        type="button"
                        onClick={() => field.onChange(color.code)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          selectedColorCode === color.code
                            ? "border-foreground scale-110 shadow-[0_0_10px_currentColor]"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: color.code }}
                        title={color.name}
                        data-testid={`color-${color.name.toLowerCase()}`}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="monthlyPayment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Monthly Payment (₱)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      data-testid="input-monthly-payment"
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="oilChangeIntervalKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Oil Change Interval (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1000"
                        placeholder="5000"
                        {...field}
                        data-testid="input-oil-interval"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 font-mono text-xs uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
                disabled={createMutation.isPending}
                data-testid="button-add-car"
              >
                {createMutation.isPending ? "Adding..." : "Add Car"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
