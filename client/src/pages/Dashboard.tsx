import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { CreateRentalDialog } from "@/components/CreateRentalDialog";
import { AvailableCarsDialog } from "@/components/AvailableCarsDialog";
import type { Car, Rental } from "@shared/schema";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [createRentalOpen, setCreateRentalOpen] = useState(false);
  const [availableCarsOpen, setAvailableCarsOpen] = useState(false);

  const { data: cars, isLoading: carsLoading } = useQuery<Car[]>({
    queryKey: ["/api/cars"],
  });

  const { data: rentals, isLoading: rentalsLoading } = useQuery<Rental[]>({
    queryKey: ["/api/rentals"],
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const getRentalsForDay = (day: Date) => {
    if (!rentals) return [];
    return rentals.filter((rental) => {
      const start = parseISO(rental.startDate as string);
      const end = parseISO(rental.endDate as string);
      return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
    });
  };

  const getCarById = (carId: number) => {
    return cars?.find((car) => car.id === carId);
  };

  const getAvailableCarsForDate = (date: Date) => {
    if (!cars) return [];
    const dayRentals = getRentalsForDay(date);
    const rentedCarIds = new Set(dayRentals.map(r => r.carId));
    return cars.filter(car => !rentedCarIds.has(car.id));
  };

  const getNextRentalDateForCar = (carId: number, fromDate: Date) => {
    if (!rentals) return null;
    const carRentals = rentals
      .filter(r => r.carId === carId)
      .map(r => ({ startDate: parseISO(r.startDate as string), endDate: parseISO(r.endDate as string) }))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    const nextRental = carRentals.find(r => r.startDate > fromDate);
    return nextRental ? nextRental.startDate : null;
  };

  const selectedDayRentals = useMemo(() => {
    if (!selectedDate) return [];
    return getRentalsForDay(selectedDate);
  }, [selectedDate, rentals]);

  const selectedDayAvailableCars = useMemo(() => {
    if (!selectedDate) return [];
    return getAvailableCarsForDate(selectedDate);
  }, [selectedDate, cars, rentals]);

  const isLoading = carsLoading || rentalsLoading;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <Button onClick={() => setCreateRentalOpen(true)} data-testid="button-new-rental">
          <Plus className="h-4 w-4 mr-2" />
          New Rental
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg">
                  {format(currentMonth, "MMMM yyyy")}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    data-testid="button-prev-month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date())}
                    data-testid="button-today"
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    data-testid="button-next-month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-px mb-1">
                    {WEEKDAYS.map((day) => (
                      <div
                        key={day}
                        className="p-2 text-center text-sm font-medium text-muted-foreground"
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
                    {paddingDays.map((_, index) => (
                      <div key={`pad-${index}`} className="bg-background p-2 min-h-24" />
                    ))}
                    {calendarDays.map((day) => {
                      const dayRentals = getRentalsForDay(day);
                      const isToday = isSameDay(day, new Date());
                      const isSelected = selectedDate && isSameDay(day, selectedDate);

                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDate(day)}
                          className={`bg-background p-2 min-h-24 text-left hover-elevate transition-colors cursor-pointer ${
                            isSelected ? "ring-2 ring-primary ring-inset" : ""
                          }`}
                          data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                        >
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full ${
                              isToday
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "font-medium"
                            }`}
                          >
                            {format(day, "d")}
                          </span>
                          <div className="mt-1 space-y-1">
                            {dayRentals.slice(0, 3).map((rental) => {
                              const car = getCarById(rental.carId);
                              return (
                                <div
                                  key={rental.id}
                                  className="text-xs px-1.5 py-0.5 rounded truncate"
                                  style={{
                                    backgroundColor: car?.colorCode ?? "#6366f1",
                                    color: "#fff",
                                  }}
                                >
                                  {car?.name ?? "Unknown"}
                                </div>
                              );
                            })}
                            {dayRentals.length > 3 && (
                              <div className="text-xs text-muted-foreground px-1.5">
                                +{dayRentals.length - 3} more
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {cars && cars.length > 0 && (
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Car Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {cars.map((car) => (
                    <div key={car.id} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: car.colorCode }}
                      />
                      <span className="text-sm">{car.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Select a Day"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground">
                  Click on a day to see rental details
                </p>
              ) : selectedDayRentals.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">No rentals on this day</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setCreateRentalOpen(true)}
                    data-testid="button-add-rental-selected"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rental
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setAvailableCarsOpen(true)}
                    data-testid="button-view-available-cars"
                  >
                    View Available Cars
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayRentals.map((rental) => {
                    const car = getCarById(rental.carId);
                    return (
                      <div
                        key={rental.id}
                        className="p-3 rounded-md border"
                        data-testid={`rental-card-${rental.id}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: car?.colorCode ?? "#6366f1" }}
                          />
                          <span className="font-medium text-sm">{car?.name ?? "Unknown Car"}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {rental.customerName}
                        </p>
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>
                            {format(parseISO(rental.startDate as string), "MMM d")} -{" "}
                            {format(parseISO(rental.endDate as string), "MMM d")}
                          </span>
                          <Badge variant={rental.isFinalized ? "secondary" : "outline"} className="text-xs">
                            {rental.isFinalized ? "Finalized" : "Active"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateRentalDialog
        open={createRentalOpen}
        onOpenChange={setCreateRentalOpen}
        selectedDate={selectedDate}
      />

      {selectedDate && (
        <AvailableCarsDialog
          open={availableCarsOpen}
          onOpenChange={setAvailableCarsOpen}
          selectedDate={selectedDate}
          cars={cars || []}
          rentals={rentals || []}
        />
      )}
    </div>
  );
}
