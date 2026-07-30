import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AffectedRental, AvailabilityResponse, Car } from "@shared/schema";

type SwitchCarDialogProps = {
  rental: AffectedRental;
  currentCar: Car;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const formatRentalPrice = (value: string | number) =>
  `₱${Number(value).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const matchesApiFamily = (queryKey: readonly unknown[], path: string) =>
  typeof queryKey[0] === "string" &&
  (queryKey[0] === path ||
    queryKey[0].startsWith(`${path}/`) ||
    queryKey[0].startsWith(`${path}?`));

export type SwitchErrorDisposition =
  | "refresh-availability"
  | "rental-finalized"
  | "same-car"
  | "fallback";

export function getSwitchErrorCode(error: Error): string | undefined {
  const separator = error.message.indexOf(":");
  if (separator < 0) return undefined;
  const status = Number(error.message.slice(0, separator).trim());
  if (status !== 409) return undefined;
  try {
    const body = JSON.parse(error.message.slice(separator + 1).trim()) as { code?: unknown };
    return typeof body.code === "string" ? body.code : undefined;
  } catch {
    return undefined;
  }
}

export function classifySwitchError(error: Error): SwitchErrorDisposition {
  switch (getSwitchErrorCode(error)) {
    case "CAR_DATE_CONFLICT":
    case "CAR_IN_MAINTENANCE":
      return "refresh-availability";
    case "RENTAL_FINALIZED":
      return "rental-finalized";
    case "SAME_CAR":
      return "same-car";
    default:
      return "fallback";
  }
}

export function SwitchCarDialog({
  rental,
  currentCar,
  open,
  onOpenChange,
}: SwitchCarDialogProps) {
  const { toast } = useToast();
  const [selectedCarId, setSelectedCarId] = useState("");
  const [reason, setReason] = useState("");
  const availabilityUrl = `/api/availability?startDate=${rental.startDate}&endDate=${rental.endDate}&excludeRentalId=${rental.id}`;
  const { data, isLoading, isError, refetch } = useQuery<AvailabilityResponse>({
    queryKey: [availabilityUrl],
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (open) {
      setSelectedCarId("");
      setReason("");
    }
  }, [open, rental.id]);

  const availableCars = data?.available.filter((candidate) => candidate.id !== currentCar.id) ?? [];
  const trimmedReason = reason.trim();
  const switchMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/rentals/${rental.id}/switch-car`, {
        newCarId: Number(selectedCarId),
        reason: trimmedReason,
      }),
    onSuccess: async () => {
      await Promise.all([
        ...["/api/rentals", "/api/cars", "/api/availability", "/api/dashboard"].map((path) =>
          queryClient.invalidateQueries({
            predicate: (query) => matchesApiFamily(query.queryKey, path),
          }),
        ),
        queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/rental-logs"] }),
      ]);
      toast({ title: "Car switched", description: "The rental and audit history have been updated." });
      onOpenChange(false);
    },
    onError: async (error: Error) => {
      const disposition = classifySwitchError(error);
      if (disposition === "refresh-availability") {
        setSelectedCarId("");
        await refetch();
        toast({
          title: "Replacement no longer available",
          description: "Availability has been refreshed. Please choose another car.",
          variant: "destructive",
        });
        return;
      }
      if (disposition === "rental-finalized") {
        toast({
          title: "Rental already finalized",
          description: "Finalized rentals cannot be switched. Close this dialog to review the rental.",
          variant: "destructive",
        });
        return;
      }
      if (disposition === "same-car") {
        toast({
          title: "Choose a different car",
          description: "The selected replacement is already assigned to this rental.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Unable to switch car",
        description: "The rental was not changed. Refresh the page or try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !switchMutation.isPending && onOpenChange(nextOpen)}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-4 pt-5 sm:px-6">
          <DialogTitle>Switch rental car</DialogTitle>
          <DialogDescription>
            Choose an available replacement for {rental.customerName} from {rental.startDate} to {rental.endDate}.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 flex-1 space-y-5 overflow-y-auto px-4 py-1 sm:px-6">
          <dl className="grid min-w-0 gap-2 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Rental ID</dt>
              <dd className="font-medium">#{rental.id}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Original car</dt>
              <dd className="break-words font-medium">
                {currentCar.name} ({currentCar.plateNumber})
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Reservation status</dt>
              <dd className="capitalize">{rental.reservationStatus}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Payment status</dt>
              <dd className="capitalize">{rental.paymentStatus}</dd>
            </div>
          </dl>

          <Alert>
            <AlertTitle>Price and payments stay unchanged</AlertTitle>
            <AlertDescription>
              The rental remains {formatRentalPrice(rental.totalAmount)}. Confirmed reservation and
              total-payment records will not be changed, and no refund will be created.
            </AlertDescription>
          </Alert>

          <fieldset className="min-w-0 space-y-3">
            <legend className="text-sm font-medium">Replacement car</legend>
            {isLoading ? (
              <div className="space-y-2" aria-label="Loading available cars">
                {[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full" />)}
              </div>
            ) : isError ? (
              <div className="rounded-md border border-destructive/40 p-4 text-sm">
                <p>Available cars could not be loaded.</p>
                <Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            ) : availableCars.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No replacement cars are available for these dates.
              </p>
            ) : (
              <RadioGroup
                value={selectedCarId}
                onValueChange={setSelectedCarId}
                className="grid min-w-0 gap-2"
                aria-label="Available replacement cars"
              >
                {availableCars.map((candidate) => {
                  const id = `switch-car-${candidate.id}`;
                  return (
                    <Label
                      key={candidate.id}
                      htmlFor={id}
                      className="flex min-h-16 min-w-0 cursor-pointer items-center gap-3 rounded-md border p-3 has-[:focus-visible]:ring-2 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                      <RadioGroupItem id={id} value={String(candidate.id)} className="shrink-0" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{candidate.name}</span>
                        <span className="block break-words text-sm text-muted-foreground">
                          {[candidate.brand, candidate.model, candidate.plateNumber].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </Label>
                  );
                })}
              </RadioGroup>
            )}
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="switch-car-reason">Reason for switching</Label>
            <Textarea
              id="switch-car-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={3}
              maxLength={500}
              rows={4}
              className="min-h-24 resize-y"
              aria-describedby="switch-car-reason-help"
              placeholder="Explain why this rental needs a different car"
            />
            <p id="switch-car-reason-help" className="text-xs text-muted-foreground">
              Required, 3–500 characters. This reason will appear in the audit history.
            </p>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t px-4 py-4 sm:px-6">
          <Button type="button" variant="outline" className="min-h-11" disabled={switchMutation.isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={!selectedCarId || trimmedReason.length < 3 || switchMutation.isPending}
            onClick={() => switchMutation.mutate()}
          >
            {switchMutation.isPending ? "Switching…" : "Confirm car switch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
