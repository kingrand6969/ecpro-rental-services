import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, AlertTriangle, Wrench, Fuel } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { AddCarDialog } from "@/components/AddCarDialog";
import { CarExpensesDialog } from "@/components/CarExpensesDialog";
import { CarDetailsDialog, getRegistrationStatus } from "@/components/CarDetailsDialog";
import { getOilChangeStatus, formatDaysAge } from "@/lib/oilChange";
import type { Car } from "@shared/schema";

const statusBadge: Record<string, string> = {
  available: "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30",
  rented: "bg-neon-magenta/15 text-neon-magenta border border-neon-magenta/30",
  maintenance: "bg-chart-4/15 text-chart-4 border border-chart-4/30",
};

export default function Cars() {
  const { isAdmin } = useAuth();
  const [addCarOpen, setAddCarOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [expensesCarId, setExpensesCarId] = useState<number | null>(null);

  const { data: cars, isLoading } = useQuery<Car[]>({
    queryKey: ["/api/cars"],
  });

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 h-14 border-b border-border flex-wrap shrink-0 bg-background/60 backdrop-blur">
        <h1
          className="font-mono text-base md:text-lg font-bold uppercase tracking-widest text-foreground"
          data-testid="text-cars-title"
        >
          Fleet
        </h1>
        {isAdmin && (
          <Button
            onClick={() => setAddCarOpen(true)}
            size="sm"
            data-testid="button-add-car"
            className="font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Car
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 neon-scrollbar">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-panel rounded-md p-4">
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : cars && cars.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cars.map((car) => (
              <div
                key={car.id}
                className="glass-panel rounded-md overflow-hidden hover-elevate cursor-pointer flex flex-col"
                onClick={() => setSelectedCar(car)}
                data-testid={`car-card-${car.id}`}
              >
                <div
                  className="h-1.5"
                  style={{ backgroundColor: car.colorCode }}
                />
                {car.imageUrl && (
                  <div className="aspect-video bg-black/40 overflow-hidden">
                    <img
                      src={car.imageUrl}
                      alt={car.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4 pb-3 flex items-start justify-between gap-2">
                  <h3 className="font-mono text-sm uppercase tracking-widest text-foreground" data-testid={`text-car-name-${car.id}`}>
                    {car.name}
                  </h3>
                  <Badge className={statusBadge[car.status] ?? ""}>
                    {car.status.charAt(0).toUpperCase() + car.status.slice(1)}
                  </Badge>
                </div>
                <div className="px-4 pb-4 flex-1 flex flex-col">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Plate Number</span>
                      <span className="font-mono tabular-nums text-foreground">{car.plateNumber}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Monthly Payment</span>
                      <span className="font-mono tabular-nums text-neon-cyan">
                        ₱{parseFloat(car.monthlyPayment).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Last Oil Change</span>
                      <span className="font-mono tabular-nums text-foreground">
                        {(car.lastOilChangeMileage ?? 0).toLocaleString()} km
                      </span>
                    </div>

                    {car.lastMaintenanceDate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Last Maintenance</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {format(parseISO(car.lastMaintenanceDate as string), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}

                    {(car.registrationConfirmedAt || car.dateAcquired) && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Last Registration</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {car.registrationConfirmedAt
                            ? format(parseISO(car.registrationConfirmedAt as string), "MMM d, yyyy")
                            : car.dateAcquired
                              ? format(parseISO(car.dateAcquired as string), "MMM d, yyyy")
                              : "N/A"}
                        </span>
                      </div>
                    )}

                    {getRegistrationStatus(car).status === "overdue" && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-mono text-xs uppercase tracking-wider">OR CR Needs Update</span>
                      </div>
                    )}

                    {getRegistrationStatus(car).status === "warning" && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-mono text-xs uppercase tracking-wider">OR CR Due in {getRegistrationStatus(car).daysUntilDue}d</span>
                      </div>
                    )}

                    {(() => {
                      const oil = getOilChangeStatus(car);
                      if (!oil.due) return null;
                      let label = "Oil Change Due";
                      if (oil.reasonKm && oil.reasonTime) {
                        label = `Oil Change Due · ${oil.kmSince.toLocaleString()} km / ${
                          oil.daysSince != null ? formatDaysAge(oil.daysSince) : ""
                        }`;
                      } else if (oil.reasonKm) {
                        label = `Oil Change Due · ${oil.kmSince.toLocaleString()} km`;
                      } else if (oil.reasonTime && oil.daysSince != null) {
                        label = `Oil Change Due · ${formatDaysAge(oil.daysSince)} since change`;
                      }
                      return (
                        <div
                          className="flex items-center gap-2 p-2 rounded-md bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/30"
                          data-testid={`warning-oil-${car.id}`}
                        >
                          <Wrench className="h-4 w-4" />
                          <span className="font-mono text-xs uppercase tracking-wider">{label}</span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 font-mono text-xs uppercase tracking-wider"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpensesCarId(car.id);
                      }}
                      data-testid={`button-expenses-${car.id}`}
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      Expenses
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-md p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-4">
              <Fuel className="h-8 w-8 text-neon-cyan" />
            </div>
            <h3 className="font-mono text-sm uppercase tracking-widest text-foreground mb-2">No cars yet</h3>
            <p className="text-muted-foreground mb-4">
              {isAdmin
                ? "Add your first car to start managing your fleet."
                : "No cars have been added yet."}
            </p>
            {isAdmin && (
              <Button
                onClick={() => setAddCarOpen(true)}
                className="font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Car
              </Button>
            )}
          </div>
        )}
      </div>

      {isAdmin && (
        <AddCarDialog open={addCarOpen} onOpenChange={setAddCarOpen} />
      )}

      <CarExpensesDialog
        carId={expensesCarId}
        onClose={() => setExpensesCarId(null)}
      />

      <CarDetailsDialog
        car={selectedCar}
        onClose={() => setSelectedCar(null)}
      />
    </div>
  );
}
