import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  isSameDay,
  isWithinInterval,
  parseISO,
  differenceInDays,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameMonth,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Calendar } from "lucide-react";
import { CreateRentalDialog } from "@/components/CreateRentalDialog";
import { RentalDetailsDialog } from "@/components/RentalDetailsDialog";
import { AvailableCarsDialog } from "@/components/AvailableCarsDialog";
import type { Car, Rental } from "@shared/schema";

type ViewMode = "day" | "week" | "month";

// Distinct colors for timeline bars
const TIMELINE_COLORS = [
  "#F59E0B", // Amber/Orange
  "#10B981", // Green
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#F97316", // Orange
  "#6366F1", // Indigo
  "#84CC16", // Lime
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

  // Assign distinct colors to cars for timeline view
  const carColorMap = useMemo(() => {
    const map = new Map<number, string>();
    cars?.forEach((car, idx) => {
      // Use car's colorCode if it's not black/dark, otherwise assign from palette
      const isBlackish = car.colorCode?.toLowerCase() === "#1a1a1a" || 
                         car.colorCode?.toLowerCase() === "#000000" ||
                         car.colorCode?.toLowerCase() === "#000";
      map.set(car.id, isBlackish ? TIMELINE_COLORS[idx % TIMELINE_COLORS.length] : car.colorCode);
    });
    return map;
  }, [cars]);

  // Calculate visible date range based on view mode
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
        // Show about 3 weeks
        start = subDays(currentDate, 5);
        end = addDays(currentDate, 16);
        break;
    }
    
    return { start, end };
  }, [currentDate, viewMode]);

  const visibleDays = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [dateRange]);

  // Group days by month for headers
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

  // Get rentals for a specific car
  const getRentalsForCar = (carId: number) => {
    if (!rentals) return [];
    return rentals.filter((rental) => rental.carId === carId);
  };

  // Calculate rental bar properties
  const getRentalBars = (carId: number) => {
    const carRentals = getRentalsForCar(carId);
    const bars: {
      rental: Rental;
      startIndex: number;
      endIndex: number;
      startTime?: string;
      endTime?: string;
      daysCount: number;
    }[] = [];

    carRentals.forEach((rental) => {
      const rentalStart = parseISO(rental.startDate as string);
      const rentalEnd = parseISO(rental.endDate as string);

      // Find start and end indices in visible days
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

      // Adjust for rentals that start before visible range
      if (rentalStart < visibleDays[0] && rentalEnd >= visibleDays[0]) {
        startIndex = 0;
      }
      
      // Adjust for rentals that end after visible range
      if (rentalEnd > visibleDays[visibleDays.length - 1] && rentalStart <= visibleDays[visibleDays.length - 1]) {
        endIndex = visibleDays.length - 1;
      }

      // Find rental overlapping visible range even if start/end not directly visible
      if (startIndex === -1 && endIndex === -1) {
        const rangeStart = visibleDays[0];
        const rangeEnd = visibleDays[visibleDays.length - 1];
        if (rentalStart <= rangeStart && rentalEnd >= rangeEnd) {
          startIndex = 0;
          endIndex = visibleDays.length - 1;
        }
      }

      // Handle partial overlaps
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
          startTime: format(rentalStart, "HH:mm"),
          endTime: format(rentalEnd, "HH:mm"),
          daysCount,
        });
      }
    });

    return bars;
  };

  const isLoading = carsLoading || rentalsLoading;

  const DAY_WIDTH = 70;
  const CAR_ROW_HEIGHT = 38;
  const CAR_LABEL_WIDTH = 160;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-3 border-b flex-wrap bg-card">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Calendar</h1>
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

      {/* Main Content */}
      {isLoading ? (
        <div className="p-6 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar - Car names */}
          <div 
            className="flex-shrink-0 border-r bg-card z-10"
            style={{ width: CAR_LABEL_WIDTH }}
          >
            {/* Check availability + New Rental buttons */}
            <div className="border-b p-2 space-y-1">
              <Button
                onClick={() => setAvailableCarsOpen(true)}
                size="sm"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                data-testid="button-check-availability"
              >
                Check availability
              </Button>
              <Button
                onClick={() => setCreateRentalOpen(true)}
                size="sm"
                variant="outline"
                className="w-full"
                data-testid="button-new-rental"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Rental
              </Button>
            </div>
            
            {/* Month header spacer */}
            <div className="h-7 border-b" />
            {/* Day header spacer */}
            <div className="h-8 border-b" />
            
            {/* Car rows */}
            <div className="overflow-y-auto" style={{ maxHeight: `calc(100vh - 220px)` }}>
              {cars?.map((car, idx) => (
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
                    style={{ backgroundColor: carColorMap.get(car.id) }}
                  />
                  <span className="text-sm truncate">{car.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Grid */}
          <div className="flex-1 overflow-hidden relative">
            {/* Navigation arrows */}
            <button
              onClick={() => navigate("prev")}
              className="absolute left-2 bottom-4 z-20 bg-background border rounded-full p-1.5 shadow-md hover-elevate"
              data-testid="button-nav-prev"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate("next")}
              className="absolute right-2 bottom-4 z-20 bg-background border rounded-full p-1.5 shadow-md hover-elevate"
              data-testid="button-nav-next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <ScrollArea className="h-full">
              <div style={{ minWidth: visibleDays.length * DAY_WIDTH }}>
                {/* Month headers */}
                <div className="flex border-b bg-muted/50 sticky top-0 z-10">
                  {monthGroups.map((group, idx) => (
                    <div
                      key={idx}
                      className="text-center text-sm font-semibold py-1 border-r"
                      style={{ width: group.days.length * DAY_WIDTH }}
                    >
                      {format(group.month, "MMMM yyyy")}
                    </div>
                  ))}
                </div>

                {/* Day headers */}
                <div className="flex border-b bg-muted/30 sticky top-7 z-10">
                  {visibleDays.map((day, idx) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div
                        key={idx}
                        className={`text-center py-1.5 border-r ${
                          isToday ? "bg-yellow-100 dark:bg-yellow-900/30" : ""
                        }`}
                        style={{ width: DAY_WIDTH }}
                      >
                        <div className={`text-xs ${isToday ? "font-semibold text-yellow-700 dark:text-yellow-400" : "text-muted-foreground"}`}>
                          {format(day, "EEE")} {format(day, "d")}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Car timeline rows */}
                <div>
                  {cars?.map((car) => {
                    const bars = getRentalBars(car.id);
                    const carColor = carColorMap.get(car.id) || "#6366f1";
                    
                    return (
                      <div
                        key={car.id}
                        className="relative border-b"
                        style={{ height: CAR_ROW_HEIGHT }}
                      >
                        {/* Grid lines and today highlight */}
                        <div className="absolute inset-0 flex">
                          {visibleDays.map((day, idx) => {
                            const isToday = isSameDay(day, new Date());
                            return (
                              <div
                                key={idx}
                                className={`border-r ${isToday ? "bg-yellow-50 dark:bg-yellow-900/10" : ""}`}
                                style={{ width: DAY_WIDTH }}
                              />
                            );
                          })}
                        </div>

                        {/* Rental bars */}
                        {bars.map((bar) => {
                          const left = bar.startIndex * DAY_WIDTH;
                          const width = (bar.endIndex - bar.startIndex + 1) * DAY_WIDTH;
                          
                          return (
                            <div
                              key={bar.rental.id}
                              className="absolute top-1 cursor-pointer hover:brightness-110 transition-all shadow-sm"
                              style={{
                                left: left + 2,
                                width: width - 4,
                                height: CAR_ROW_HEIGHT - 8,
                                backgroundColor: carColor,
                                borderRadius: 3,
                              }}
                              onClick={() => setSelectedRental(bar.rental)}
                              data-testid={`rental-bar-${bar.rental.id}`}
                            >
                              <div className="flex items-center justify-between h-full px-1.5 text-white text-xs font-medium overflow-hidden">
                                <span className="opacity-80 flex-shrink-0">
                                  {bar.startTime !== "00:00" ? bar.startTime : ""}
                                </span>
                                <span className="mx-1 truncate text-center flex-1">
                                  {width > 60 ? bar.daysCount : ""}
                                </span>
                                <span className="opacity-80 flex-shrink-0">
                                  {bar.endTime !== "00:00" && bar.startIndex !== bar.endIndex ? bar.endTime : ""}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
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
