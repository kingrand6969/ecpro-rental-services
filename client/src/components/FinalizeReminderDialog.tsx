import { useMutation, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, Clock, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Rental, Car } from "@shared/schema";

interface FinalizeReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cars: Car[];
}

export function FinalizeReminderDialog({ isOpen, onClose, cars }: FinalizeReminderDialogProps) {
  const { toast } = useToast();

  const { data: pendingRentals = [], isLoading } = useQuery<Rental[]>({
    queryKey: ["/api/rentals/pending-finalization"],
    enabled: isOpen,
    refetchInterval: false,
  });

  const finalizeMutation = useMutation({
    mutationFn: async (rentalId: number) => {
      await apiRequest("PATCH", `/api/rentals/${rentalId}`, { isFinalized: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rentals/pending-finalization"] });
      toast({
        title: "Booking Finalized",
        description: "The rental has been marked as finalized",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to finalize rental",
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (rentalId: number) => {
      await apiRequest("POST", `/api/rentals/${rentalId}/dismiss-reminder`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rentals/pending-finalization"] });
      toast({
        title: "Reminder Dismissed",
        description: "You'll be reminded again in 12 hours",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to dismiss reminder",
        variant: "destructive",
      });
    },
  });

  const getCarDetails = (carId: number) => {
    return cars.find(c => c.id === carId);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <DialogTitle>Finalization Reminder</DialogTitle>
          </div>
          <DialogDescription>
            The following bookings are not yet finalized. Would you like to finalize them?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-4">Loading...</p>
          ) : pendingRentals.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No pending reminders at this time
            </p>
          ) : (
            pendingRentals.map((rental) => {
              const car = getCarDetails(rental.carId);
              return (
                <Card key={rental.id} className="p-4" data-testid={`reminder-card-${rental.id}`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {car && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: car.colorCode }}
                          />
                        )}
                        <span className="font-medium">{car?.name ?? "Unknown Car"}</span>
                        <Badge variant="outline">{car?.plateNumber}</Badge>
                      </div>
                      <Badge variant="secondary">Not Finalized</Badge>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{rental.customerName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(parseISO(rental.startDate as string), "MMM d")} - {format(parseISO(rental.endDate as string), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">
                        ₱{parseFloat(rental.totalAmount).toLocaleString()}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => dismissMutation.mutate(rental.id)}
                          disabled={dismissMutation.isPending}
                          data-testid={`dismiss-reminder-${rental.id}`}
                        >
                          Remind Later
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => finalizeMutation.mutate(rental.id)}
                          disabled={finalizeMutation.isPending}
                          data-testid={`finalize-rental-${rental.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Finalize
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose} data-testid="close-reminder-dialog">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
