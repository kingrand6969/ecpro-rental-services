import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, AlertTriangle, Wrench, Fuel } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AddCarDialog } from "@/components/AddCarDialog";
import { CarExpensesDialog } from "@/components/CarExpensesDialog";
import { CarDetailsDialog } from "@/components/CarDetailsDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Car, Expense } from "@shared/schema";

const statusColors: Record<string, string> = {
  available: "bg-green-500/10 text-green-600 dark:text-green-400",
  rented: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  maintenance: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
};

export default function Cars() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [addCarOpen, setAddCarOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [expensesCarId, setExpensesCarId] = useState<number | null>(null);

  const { data: cars, isLoading } = useQuery<Car[]>({
    queryKey: ["/api/cars"],
  });

  const needsOilChange = (car: Car) => {
    const mileageSinceChange = (car.currentMileage ?? 0) - (car.lastOilChangeMileage ?? 0);
    return mileageSinceChange >= (car.oilChangeIntervalKm ?? 5000);
  };

  const getMileageUntilOilChange = (car: Car) => {
    const mileageSinceChange = (car.currentMileage ?? 0) - (car.lastOilChangeMileage ?? 0);
    return Math.max(0, (car.oilChangeIntervalKm ?? 5000) - mileageSinceChange);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <h1 className="text-2xl font-semibold">Cars</h1>
        {isAdmin && (
          <Button onClick={() => setAddCarOpen(true)} data-testid="button-add-car">
            <Plus className="h-4 w-4 mr-2" />
            Add Car
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : cars && cars.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car) => (
            <Card
              key={car.id}
              className="overflow-hidden hover-elevate cursor-pointer"
              onClick={() => setSelectedCar(car)}
              data-testid={`car-card-${car.id}`}
            >
              <div
                className="h-3"
                style={{ backgroundColor: car.colorCode }}
              />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{car.name}</CardTitle>
                    <CardDescription>{car.model}</CardDescription>
                  </div>
                  <Badge className={statusColors[car.status] ?? ""}>
                    {car.status.charAt(0).toUpperCase() + car.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Plate Number</span>
                    <span className="font-medium">{car.plateNumber}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Monthly Payment</span>
                    <span className="font-medium">
                      ${parseFloat(car.monthlyPayment).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Current Mileage</span>
                    <span className="font-medium">
                      {(car.currentMileage ?? 0).toLocaleString()} km
                    </span>
                  </div>

                  {needsOilChange(car) ? (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Oil Change Due</span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Next oil change in {getMileageUntilOilChange(car).toLocaleString()} km
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
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
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Fuel className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No cars yet</h3>
            <p className="text-muted-foreground mb-4">
              {isAdmin
                ? "Add your first car to start managing your fleet."
                : "No cars have been added yet."}
            </p>
            {isAdmin && (
              <Button onClick={() => setAddCarOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Car
              </Button>
            )}
          </CardContent>
        </Card>
      )}

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
