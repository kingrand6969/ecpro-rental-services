import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import type { Car, Rental } from "@shared/schema";

interface AvailableCarsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  cars: Car[];
  rentals: Rental[];
}

export function AvailableCarsDialog({
  open,
  onOpenChange,
  selectedDate,
  cars,
  rentals,
}: AvailableCarsDialogProps) {
  const getAvailableCarsForDate = (date: Date) => {
    const dayRentals = rentals.filter((rental) => {
      const start = parseISO(rental.startDate as string);
      const end = parseISO(rental.endDate as string);
      return (date >= start && date <= end) || date.toDateString() === start.toDateString() || date.toDateString() === end.toDateString();
    });
    const rentedCarIds = new Set(dayRentals.map(r => r.carId));
    return cars.filter(car => !rentedCarIds.has(car.id));
  };

  const getNextRentalDateForCar = (carId: number, fromDate: Date) => {
    const carRentals = rentals
      .filter(r => r.carId === carId)
      .map(r => ({ startDate: parseISO(r.startDate as string) }))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    const nextRental = carRentals.find(r => r.startDate > fromDate);
    return nextRental ? nextRental.startDate : null;
  };

  const availableCars = getAvailableCarsForDate(selectedDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-base uppercase tracking-widest">Available Cars</DialogTitle>
          <DialogDescription className="font-mono text-xs uppercase tracking-widest text-neon-cyan">
            {format(selectedDate, "MMMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {availableCars.length > 0 ? (
            availableCars.map((car) => {
              const nextRental = getNextRentalDateForCar(car.id, selectedDate);
              return (
                <div
                  key={car.id}
                  className="p-3 rounded-md border border-border bg-card"
                  data-testid={`available-car-popup-${car.id}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: car.colorCode }}
                    />
                    <span className="font-medium">{car.name}</span>
                  </div>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    {nextRental
                      ? `Available until ${format(new Date(nextRental.getTime() - 86400000), "MMM d")}`
                      : "Available all month"}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground py-4 text-center">
              No cars available on this date
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
