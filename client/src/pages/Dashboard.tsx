import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  addDays,
  subDays,
  isSameDay,
  parseISO,
  differenceInDays,
  eachDayOfInterval,
  isSameMonth,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Plus } from "lucide-react";
import { CreateRentalDialog } from "@/components/CreateRentalDialog";
import { RentalDetailsDialog } from "@/components/RentalDetailsDialog";
import { AvailableCarsDialog } from "@/components/AvailableCarsDialog";
import type { Car, Rental } from "@shared/schema";

const TIMELINE_COLORS = [
  "#F59E0B",
  "#3B82F6",
  "#8B5CF6",
  "#EF4444",
  "#10B981",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
  "#84CC16",
];

export default function Dashboard() {
  const [createRentalOpen, setCreateRentalOpen] = useState(false);
  const [availableCarsOpen, setAvailableCarsOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [expandedCars, setExpandedCars] = useState<Set<number>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayColumnRef = useRef<HTMLDivElement>(null);

  const { data: cars, isLoading: carsLoading } = useQuery<Car[]>({
    queryKey: ["/api/cars"],
  });

  const { data: rentals, isLoading: rentalsLoading } = useQuery<Rental[]>({
    queryKey: ["/api/rentals"],
  });

  const carColorMap = useMemo(() => {
    const map = new Map<number, string>();
    cars?.forEach((car, idx) => {
      const isBlackish = car.colorCode?.toLowerCase() === "#1a1a1a" || 
                         car.colorCode?.toLowerCase() === "#000000" ||
                         car.colorCode?.toLowerCase() === "#000";
      map.set(car.id, isBlackish ? TIMELINE_COLORS[idx % TIMELINE_COLORS.length] : car.colorCode);
    });
    return map;
  }, [cars]);

  // Show 90 days before and 90 days after today for scrollable range
  const visibleDays = useMemo(() => {
    const today = new Date();
    const start = subDays(today, 60);
    const end = addDays(today, 90);
    return eachDayOfInterval({ start, end });
  }, []);

  // Find today's index for initial scroll position
  const todayIndex = useMemo(() => {
    const today = new Date();
    return visibleDays.findIndex(day => isSameDay(day, today));
  }, [visibleDays]);

  // Scroll to today on initial load
  useEffect(() => {
    if (scrollContainerRef.current && todayIndex >= 0) {
      const DAY_WIDTH = 70;
      const CAR_LABEL_WIDTH = 140;
      // Scroll to show today near the left side
      const scrollPosition = (todayIndex * DAY_WIDTH) - 100;
      scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [todayIndex, cars]);

  const monthGroups = useMemo(() => {
    const groups: { month: Date; days: Date[]; startIndex: number }[] = [];
    let currentGroup: { month: Date; days: Date[]; startIndex: number } | null = null;

    visibleDays.forEach((day, index) => {
      if (!currentGroup || !isSameMonth(day, currentGroup.month)) {
        currentGroup = { month: day, days: [day], startIndex: index };
        groups.push(currentGroup);
      } else {
        currentGroup.days.push(day);
      }
    });

    return groups;
  }, [visibleDays]);

  const goToToday = () => {
    if (scrollContainerRef.current && todayIndex >= 0) {
      const DAY_WIDTH = 70;
      const scrollPosition = (todayIndex * DAY_WIDTH) - 100;
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
    }
  };

  const toggleCarExpanded = (carId: number) => {
    const newExpanded = new Set(expandedCars);
    if (newExpanded.has(carId)) {
      newExpanded.delete(carId);
    } else {
      newExpanded.add(carId);
    }
    setExpandedCars(newExpanded);
  };

  const getRentalsForCar = (carId: number) => {
    if (!rentals) return [];
    return rentals.filter((rental) => rental.carId === carId);
  };

  const getRentalBars = (carId: number) => {
    const carRentals = getRentalsForCar(carId);
    const bars: {
      rental: Rental;
      startIndex: number;
      endIndex: number;
      daysCount: number;
    }[] = [];

    carRentals.forEach((rental) => {
      const rentalStart = parseISO(rental.startDate as string);
      const rentalEnd = parseISO(rental.endDate as string);

      let startIndex = -1;
      let endIndex = -1;

      visibleDays.forEach((day, index) => {
        if (isSameDay(day, rentalStart)) {
          startIndex = index;
        }
        if (isSameDay(day, rentalEnd)) {
          endIndex = index;
        }
      });

      if (rentalStart < visibleDays[0] && rentalEnd >= visibleDays[0]) {
        startIndex = 0;
      }
      
      if (rentalEnd > visibleDays[visibleDays.length - 1] && rentalStart <= visibleDays[visibleDays.length - 1]) {
        endIndex = visibleDays.length - 1;
      }

      if (startIndex === -1 && endIndex === -1) {
        const rangeStart = visibleDays[0];
        const rangeEnd = visibleDays[visibleDays.length - 1];
        if (rentalStart <= rangeStart && rentalEnd >= rangeEnd) {
          startIndex = 0;
          endIndex = visibleDays.length - 1;
        }
      }

      if (startIndex === -1 && endIndex !== -1) {
        startIndex = 0;
      }
      if (endIndex === -1 && startIndex !== -1) {
        endIndex = visibleDays.length - 1;
      }

      if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
        const daysCount = differenceInDays(rentalEnd, rentalStart) + 1;
        bars.push({
          rental,
          startIndex,
          endIndex,
          daysCount,
        });
      }
    });

    return bars;
  };

  const isLoading = carsLoading || rentalsLoading;

  const DAY_WIDTH = 70;
  const CAR_ROW_HEIGHT = 40;
  const CAR_LABEL_WIDTH = 140;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-3 border-b flex-wrap bg-card">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateRentalOpen(true)}
            size="sm"
            variant="outline"
            data-testid="button-new-rental"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Rental
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            data-testid="button-today"
          >
            Today
          </Button>
          <span className="text-sm text-muted-foreground">
            Scroll left/right to navigate dates
          </span>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="p-6 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Fixed left column - Car labels */}
          <div 
            className="flex-shrink-0 border-r bg-card z-10"
            style={{ width: CAR_LABEL_WIDTH }}
          >
            {/* Month header spacer */}
            <div className="h-[34px] border-b bg-muted/80" />
            {/* Day header spacer */}
            <div className="h-[34px] border-b bg-muted/60" />
            
            {/* Car labels */}
            {cars?.map((car) => {
              const carColor = carColorMap.get(car.id) || "#6366f1";
              return (
                <div
                  key={car.id}
                  className="flex items-center gap-2 px-2 border-b hover-elevate cursor-pointer"
                  style={{ height: CAR_ROW_HEIGHT }}
                  onClick={() => toggleCarExpanded(car.id)}
                  data-testid={`car-row-${car.id}`}
                >
                  <ChevronDown
                    className={`h-3 w-3 text-muted-foreground transition-transform flex-shrink-0 ${
                      expandedCars.has(car.id) ? "" : "-rotate-90"
                    }`}
                  />
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: carColor }}
                  />
                  <span className="text-sm truncate">{car.name}</span>
                </div>
              );
            })}
          </div>

          {/* Scrollable timeline */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-x-auto overflow-y-auto"
          >
            <div style={{ width: visibleDays.length * DAY_WIDTH }}>
              {/* Month headers - sticky */}
              <div className="flex sticky top-0 z-20 bg-muted/80 backdrop-blur-sm border-b">
                {monthGroups.map((group, idx) => (
                  <div
                    key={idx}
                    className="text-center text-sm font-semibold py-2 border-r"
                    style={{ width: group.days.length * DAY_WIDTH }}
                  >
                    {format(group.month, "MMMM yyyy")}
                  </div>
                ))}
              </div>

              {/* Day headers - sticky */}
              <div className="flex sticky top-[34px] z-20 bg-muted/60 backdrop-blur-sm border-b">
                {visibleDays.map((day, idx) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={idx}
                      ref={isToday ? todayColumnRef : null}
                      className={`text-center py-2 border-r ${
                        isToday ? "bg-primary/30" : ""
                      }`}
                      style={{ width: DAY_WIDTH }}
                    >
                      <div className={`text-xs ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        {format(day, "EEE")} {format(day, "d")}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Car timeline rows */}
              {cars?.map((car) => {
                const bars = getRentalBars(car.id);
                const carColor = carColorMap.get(car.id) || "#6366f1";
                
                return (
                  <div
                    key={car.id}
                    className="relative flex border-b"
                    style={{ height: CAR_ROW_HEIGHT }}
                  >
                    {/* Day grid cells */}
                    {visibleDays.map((day, idx) => {
                      const isToday = isSameDay(day, new Date());
                      return (
                        <div
                          key={idx}
                          className={`border-r ${isToday ? "bg-primary/10" : ""}`}
                          style={{ width: DAY_WIDTH, height: CAR_ROW_HEIGHT }}
                        />
                      );
                    })}

                    {/* Rental bars */}
                    {bars.map((bar) => {
                      const left = bar.startIndex * DAY_WIDTH;
                      const width = (bar.endIndex - bar.startIndex + 1) * DAY_WIDTH;
                      
                      return (
                        <div
                          key={bar.rental.id}
                          className="absolute cursor-pointer hover:brightness-110 transition-all shadow-sm flex items-center justify-center"
                          style={{
                            left: left + 2,
                            top: 4,
                            width: width - 4,
                            height: CAR_ROW_HEIGHT - 8,
                            backgroundColor: carColor,
                            borderRadius: 4,
                          }}
                          onClick={() => setSelectedRental(bar.rental)}
                          data-testid={`rental-bar-${bar.rental.id}`}
                        >
                          <span className="text-white text-xs font-bold">
                            {bar.daysCount}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateRentalDialog
        open={createRentalOpen}
        onOpenChange={setCreateRentalOpen}
        selectedDate={null}
      />

      <AvailableCarsDialog
        open={availableCarsOpen}
        onOpenChange={setAvailableCarsOpen}
        selectedDate={new Date()}
        cars={cars || []}
        rentals={rentals || []}
      />

      {selectedRental && (
        <RentalDetailsDialog
          rental={selectedRental}
          onClose={() => setSelectedRental(null)}
        />
      )}
    </div>
  );
}
