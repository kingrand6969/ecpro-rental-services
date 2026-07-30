import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import type { Car } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const maintenanceSchema = z.object({
  reason: z.string().trim().min(3, "Enter at least 3 characters").max(500),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

type MaintenanceStatusDialogProps = {
  car: Car;
  mode: "maintenance" | "available";
  onClose: () => void;
  onSuccess?: (car: Car) => void;
};

export function MaintenanceStatusDialog({
  car,
  mode,
  onClose,
  onSuccess,
}: MaintenanceStatusDialogProps) {
  const { toast } = useToast();
  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    form.reset({ reason: "" });
  }, [car.id, mode, form]);

  const mutation = useMutation({
    mutationFn: async (values?: MaintenanceFormData) => {
      const response =
        mode === "maintenance"
          ? await apiRequest("PATCH", `/api/cars/${car.id}/maintenance`, {
              reason: values?.reason.trim(),
            })
          : await apiRequest("PATCH", `/api/cars/${car.id}/availability`);
      return response.json() as Promise<Car>;
    },
    onSuccess: async (updatedCar) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/cars"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/exceptions"] }),
        queryClient.invalidateQueries({
          queryKey: [`/api/cars/${car.id}/affected-rentals`],
        }),
        queryClient.invalidateQueries({ queryKey: ["/api/availability"] }),
      ]);
      toast({
        title: mode === "maintenance" ? "Maintenance status updated" : "Car is available",
        description:
          mode === "maintenance"
            ? `${car.name} is now under maintenance.`
            : `${car.name} has returned to service.`,
      });
      onSuccess?.(updatedCar);
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Unable to update maintenance status",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const isMaintenance = mode === "maintenance";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isMaintenance ? "Mark Under Maintenance" : "Return to Available"}
          </DialogTitle>
          <DialogDescription>
            {isMaintenance
              ? `Record why ${car.name} cannot be rented.`
              : `Confirm that ${car.name} is ready to be rented again.`}
          </DialogDescription>
        </DialogHeader>

        {isMaintenance ? (
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            >
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance reason</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        autoFocus
                        rows={5}
                        maxLength={500}
                        placeholder="Describe the issue or work required"
                        className="min-h-28 resize-y"
                        data-testid="input-maintenance-reason"
                      />
                    </FormControl>
                    <div className="flex items-start justify-between gap-3">
                      <FormMessage />
                      <span className="ml-auto text-xs text-muted-foreground">
                        {field.value.length}/500
                      </span>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  className="min-h-11"
                  disabled={mutation.isPending}
                  data-testid="button-confirm-maintenance"
                >
                  {mutation.isPending ? "Saving..." : "Mark Under Maintenance"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(undefined)}
              data-testid="button-confirm-available"
            >
              {mutation.isPending ? "Saving..." : "Return to Available"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
