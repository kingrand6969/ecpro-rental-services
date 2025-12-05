import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  isSameDay,
  parseISO,
  differenceInDays,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameMonth,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ChevronDown, Plus } from "lucide-react";
import { CreateRentalDialog } from "@/components/CreateRentalDialog";
import { RentalDetailsDialog } from "@/components/RentalDetailsDialog";
import { AvailableCarsDialog } from "@/components/AvailableCarsDialog";
import type { Car, Rental } from "@shared/schema";

type ViewMode = "day" | "week" | "month";

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [createRentalOpen, setCreateRentalOpen] = useState(false);
  const [availableCarsOpen, setAvailableCarsOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [expandedCars, setExpandedCars] = useState<Set<number>>(new Set());

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

  const dateRange = useMemo(() => {
    let start: Date;
    let end: Date;
    
    switch (viewMode) {
      case "day":
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
        break;
      case "week":
        start = subDays(currentDate, 3);
        end = addDays(currentDate, 3);
        break;
      case "month":
      default:
        start = subDays(currentDate, 3);
        end = addDays(currentDate, 10);
        break;
    }
    
    return { start, end };
  }, [currentDate, viewMode]);

  const visibleDays = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [dateRange]);

  const monthGroups = useMemo(() => {
    const groups: { month: Date; days: Date[] }[] = [];
    let currentGroup: { month: Date; days: Date[] } | null = null;

    visibleDays.forEach((day) => {
      if (!currentGroup || !isSameMonth(day, currentGroup.month)) {
        currentGroup = { month: day, days: [day] };
        groups.push(currentGroup);
      } else {
        currentGroup.days.push(day);
      }
    });

    return groups;
  }, [visibleDays]);

  const navigate = (direction: "prev" | "next") => {
    const offset = direction === "next" ? 1 : -1;
    switch (viewMode) {
      case "day":
        setCurrentDate(addDays(currentDate, offset));
        break;
      case "week":
        setCurrentDate(direction === "next" ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(direction === "next" ? addWeeks(currentDate, 2) : subWeeks(currentDate, 2));
        break;
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
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

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            data-testid="button-today"
          >
            Today
          </Button>
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === "day" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-none border-0"
              onClick={() => setViewMode("day")}
              data-testid="button-view-day"
            >
              Day
            </Button>
            <Button
              variant={viewMode === "week" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-none border-0"
              onClick={() => setViewMode("week")}
              data-testid="button-view-week"
            >
              Week
            </Button>
            <Button
              variant={viewMode === "month" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-none border-0"
              onClick={() => setViewMode("month")}
              data-testid="button-view-month"
            >
              Month
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      <div className="absolute left-2 top-1/2 z-30">
        <button
          onClick={() => navigate("prev")}
          className="bg-background border rounded-full p-1.5 shadow-md hover-elevate"
          data-testid="button-nav-prev"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>
      <div className="absolute right-2 top-1/2 z-30">
        <button
          onClick={() => navigate("next")}
          className="bg-background border rounded-full p-1.5 shadow-md hover-elevate"
          data-testid="button-nav-next"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Main Content - Single scroll container */}
      {isLoading ? (
        <div className="p-6 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div 
            className="inline-block min-w-full"
            style={{ minWidth: CAR_LABEL_WIDTH + visibleDays.length * DAY_WIDTH }}
          >
            {/* Header row: Month headers */}
            <div className="flex sticky top-0 z-20 bg-muted/80 backdrop-blur-sm border-b">
              <div 
                className="flex-shrink-0 border-r bg-muted/80"
                style={{ width: CAR_LABEL_WIDTH }}
              />
              {monthGroups.map((group, idx) => (
                <div
                  key={idx}
                  className="text-center text-sm font-semibold py-1.5 border-r"
                  style={{ width: group.days.length * DAY_WIDTH }}
                >
                  {format(group.month, "MMMM yyyy")}
                </div>
              ))}
            </div>

            {/* Header row: Day headers */}
            <div className="flex sticky top-[34px] z-20 bg-muted/60 backdrop-blur-sm border-b">
              <div 
                className="flex-shrink-0 border-r bg-muted/60"
                style={{ width: CAR_LABEL_WIDTH }}
              />
              {visibleDays.map((day, idx) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={idx}
                    className={`text-center py-1.5 border-r ${
                      isToday ? "bg-primary/20 font-bold" : ""
                    }`}
                    style={{ width: DAY_WIDTH }}
                  >
                    <div className={`text-xs ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {format(day, "EEE")} {format(day, "d")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Car rows - unified grid */}
            {cars?.map((car) => {
              const bars = getRentalBars(car.id);
              const carColor = carColorMap.get(car.id) || "#6366f1";
              
              return (
                <div
                  key={car.id}
                  className="flex border-b"
                  style={{ height: CAR_ROW_HEIGHT }}
                >
                  {/* Car label cell */}
                  <div
                    className="flex-shrink-0 flex items-center gap-2 px-2 border-r bg-card hover-elevate cursor-pointer"
                    style={{ width: CAR_LABEL_WIDTH }}
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

                  {/* Timeline cells - relative container for bars */}
                  <div 
                    className="relative flex"
                    style={{ width: visibleDays.length * DAY_WIDTH }}
                  >
                    {/* Day grid cells */}
                    {visibleDays.map((day, idx) => {
                      const isToday = isSameDay(day, new Date());
                      return (
                        <div
                          key={idx}
                          className={`border-r ${isToday ? "bg-primary/5" : ""}`}
                          style={{ width: DAY_WIDTH, height: CAR_ROW_HEIGHT }}
                        />
                      );
                    })}

                    {/* Rental bars - absolute positioned within this row */}
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
                </div>
              );
            })}
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
