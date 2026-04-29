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
  startOfMonth,
  endOfMonth,
  formatDistanceToNow,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileCheck,
  FileText,
  Plus,
  Wrench,
  Trash2,
} from "lucide-react";
import { CreateRentalDialog } from "@/components/CreateRentalDialog";
import { RentalDetailsDialog } from "@/components/RentalDetailsDialog";
import { AvailableCarsDialog } from "@/components/AvailableCarsDialog";
import type { Car, Rental, RentalLogWithUser } from "@shared/schema";

const TIMELINE_COLORS = [
  "#22D3EE",
  "#F472B6",
  "#A78BFA",
  "#FBBF24",
  "#34D399",
  "#F87171",
  "#60A5FA",
  "#FB923C",
  "#818CF8",
  "#A3E635",
];

function useAnimatedNumber(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const from = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(from + (target - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
      else setValue(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

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

  const { data: rentalLogs } = useQuery<RentalLogWithUser[]>({
    queryKey: ["/api/rental-logs"],
  });

  const carColorMap = useMemo(() => {
    const map = new Map<number, string>();
    cars?.forEach((car, idx) => {
      const isBlackish =
        car.colorCode?.toLowerCase() === "#1a1a1a" ||
        car.colorCode?.toLowerCase() === "#000000" ||
        car.colorCode?.toLowerCase() === "#000";
      map.set(
        car.id,
        isBlackish ? TIMELINE_COLORS[idx % TIMELINE_COLORS.length] : car.colorCode,
      );
    });
    return map;
  }, [cars]);

  // KPI calculations. `today` re-computes when the day rolls over so KPIs
  // and the date pill stay correct in long-lived sessions.
  const [today, setToday] = useState<Date>(() => new Date());
  useEffect(() => {
    const tick = () => {
      const next = new Date();
      setToday((prev) => (isSameDay(prev, next) ? prev : next));
    };
    const interval = window.setInterval(tick, 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);
  const monthStart = useMemo(() => startOfMonth(today), [today]);
  const monthEnd = useMemo(() => endOfMonth(today), [today]);

  const kpis = useMemo(() => {
    const all = rentals ?? [];
    const allCars = cars ?? [];

    const activeIds = new Set<number>();
    let todayIncome = 0;
    let monthIncome = 0;

    for (const r of all) {
      const start = parseISO(r.startDate as string);
      const end = parseISO(r.endDate as string);
      const total = parseFloat(String(r.totalAmount)) || 0;
      const inToday = today >= start && today <= end;
      if (inToday) activeIds.add(r.carId);
      if (isSameDay(start, today)) todayIncome += total;
      // Count any rental whose date range overlaps the current month at all
      // (including ones that span the entire month).
      const overlapsMonth = start <= monthEnd && end >= monthStart;
      if (overlapsMonth) {
        monthIncome += total;
      }
    }

    const totalCars = allCars.length;
    const availableCars = Math.max(0, totalCars - activeIds.size);

    return {
      activeRentals: activeIds.size,
      todayIncome,
      monthIncome,
      availableCars,
      totalCars,
    };
  }, [rentals, cars, today, monthStart, monthEnd]);

  const animActive = useAnimatedNumber(kpis.activeRentals);
  const animToday = useAnimatedNumber(kpis.todayIncome);
  const animMonth = useAnimatedNumber(kpis.monthIncome);
  const animAvailable = useAnimatedNumber(kpis.availableCars);

  // Activity feed (derive from rental logs)
  const activities = useMemo(() => {
    if (!rentalLogs) return [];
    // Sort newest-first by loggedAt so the feed is deterministic regardless
    // of server return order, then take the top 8.
    const sorted = [...rentalLogs].sort((a, b) => {
      const at = a.loggedAt ? new Date(a.loggedAt).getTime() : 0;
      const bt = b.loggedAt ? new Date(b.loggedAt).getTime() : 0;
      return bt - at;
    });
    return sorted.slice(0, 8).map((log) => {
      const display =
        log.user?.firstName && log.user?.lastName
          ? `${log.user.firstName} ${log.user.lastName}`
          : log.user?.username ?? log.user?.email ?? "Someone";
      let icon = FileText;
      let tone: "cyan" | "magenta" | "muted" = "muted";
      let title = "Rental updated";

      if (log.action === "created") {
        icon = FileCheck;
        tone = "cyan";
        title = "Rental created";
      } else if (log.action === "deleted") {
        icon = Trash2;
        tone = "magenta";
        title = "Rental deleted";
      } else if (log.action === "updated") {
        if (log.fieldName === "isFinalized") {
          icon = FileCheck;
          tone = "cyan";
          title = "Rental finalized";
        } else if (log.fieldName === "paymentStatus") {
          icon = CreditCard;
          tone = "cyan";
          title = "Payment updated";
        } else {
          icon = Wrench;
          tone = "muted";
          title = "Rental updated";
        }
      }

      const subtitle = `${log.customerName ?? "—"} / ${log.carName ?? "—"}`;
      const time = log.loggedAt
        ? formatDistanceToNow(new Date(log.loggedAt), { addSuffix: true })
        : "";
      return {
        id: log.id,
        icon,
        tone,
        title,
        subtitle,
        time,
        actor: display,
      };
    });
  }, [rentalLogs]);

  // Show 90 days before and 90 days after today for scrollable range
  const visibleDays = useMemo(() => {
    const t = new Date();
    const start = subDays(t, 60);
    const end = addDays(t, 90);
    return eachDayOfInterval({ start, end });
  }, []);

  const todayIndex = useMemo(() => {
    const t = new Date();
    return visibleDays.findIndex((day) => isSameDay(day, t));
  }, [visibleDays]);

  useEffect(() => {
    if (scrollContainerRef.current && todayIndex >= 0) {
      const DAY_WIDTH = 70;
      const scrollPosition = todayIndex * DAY_WIDTH - 100;
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
      const scrollPosition = todayIndex * DAY_WIDTH - 100;
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: "smooth",
      });
    }
  };

  const scrollByDays = (delta: number) => {
    if (scrollContainerRef.current) {
      const DAY_WIDTH = 70;
      scrollContainerRef.current.scrollBy({
        left: delta * DAY_WIDTH,
        behavior: "smooth",
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
        if (isSameDay(day, rentalStart)) startIndex = index;
        if (isSameDay(day, rentalEnd)) endIndex = index;
      });

      if (rentalStart < visibleDays[0] && rentalEnd >= visibleDays[0]) {
        startIndex = 0;
      }

      if (
        rentalEnd > visibleDays[visibleDays.length - 1] &&
        rentalStart <= visibleDays[visibleDays.length - 1]
      ) {
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
        const daysCount = differenceInDays(rentalEnd, rentalStart);
        bars.push({ rental, startIndex, endIndex, daysCount });
      }
    });

    return bars;
  };

  const isLoading = carsLoading || rentalsLoading;

  const DAY_WIDTH = 70;
  const CAR_ROW_HEIGHT = 40;
  const CAR_LABEL_WIDTH = 160;
  const MONTH_HEADER_HEIGHT = 36;
  const DAY_HEADER_HEIGHT = 36;

  const kpiCards = [
    {
      label: "Active Rentals",
      value: animActive.toString(),
      suffix: "",
      prefix: "",
    },
    {
      label: "Today's Income",
      value: animToday.toLocaleString(),
      prefix: "₱",
      suffix: "",
    },
    {
      label: "This Month",
      value: animMonth.toLocaleString(),
      prefix: "₱",
      suffix: "",
    },
    {
      label: "Available Cars",
      value: animAvailable.toString(),
      prefix: "",
      suffix: kpis.totalCars ? ` / ${kpis.totalCars}` : "",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 h-14 border-b border-border flex-wrap shrink-0 bg-background/60 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <h1
            className="font-mono text-base md:text-lg font-bold uppercase tracking-widest text-foreground"
            data-testid="text-dashboard-title"
          >
            Dashboard
          </h1>
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted border border-border text-[11px] font-mono text-muted-foreground">
            <Calendar className="h-3 w-3 text-neon-cyan" />
            <span data-testid="text-dashboard-date">
              {format(today, "MMM d, yyyy").toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            data-testid="button-today"
            className="font-mono text-xs uppercase tracking-wider"
          >
            Today
          </Button>
          <Button
            onClick={() => setCreateRentalOpen(true)}
            size="sm"
            data-testid="button-new-rental"
            className="font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Rental
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:flex lg:gap-6 neon-scrollbar min-h-0">
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiCards.map((kpi, i) => (
                <div
                  key={i}
                  className="glass-panel rounded-md p-5 flex flex-col gap-2 relative overflow-hidden group"
                  data-testid={`kpi-card-${i}`}
                >
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-neon-cyan opacity-5 blur-2xl group-hover:opacity-10 transition-opacity pointer-events-none" />
                  <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
                    {kpi.label}
                  </span>
                  <div className="flex items-baseline gap-1 mt-auto">
                    {kpi.prefix && (
                      <span className="text-lg font-mono text-neon-cyan">
                        {kpi.prefix}
                      </span>
                    )}
                    <span className="text-3xl md:text-4xl font-mono font-bold text-neon-cyan text-glow-cyan">
                      {kpi.value}
                    </span>
                    {kpi.suffix && (
                      <span className="text-sm font-mono text-muted-foreground ml-1">
                        {kpi.suffix}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Fleet Timeline */}
            <div className="glass-panel rounded-md flex-1 flex flex-col min-h-[400px] overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 shrink-0">
                <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Fleet Timeline
                </h2>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollByDays(-7)}
                    data-testid="button-scroll-prev"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollByDays(7)}
                    data-testid="button-scroll-next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Fixed left column - Car labels */}
                <div
                  className="flex-shrink-0 border-r border-border bg-card/30 z-10"
                  style={{ width: CAR_LABEL_WIDTH }}
                >
                  <div
                    className="border-b border-border bg-muted/40"
                    style={{ height: MONTH_HEADER_HEIGHT }}
                  />
                  <div
                    className="border-b border-border bg-muted/30 px-3 flex items-center"
                    style={{ height: DAY_HEADER_HEIGHT }}
                  >
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      Vehicle
                    </span>
                  </div>

                  {cars?.map((car) => {
                    const carColor = carColorMap.get(car.id) || "#22D3EE";
                    return (
                      <div
                        key={car.id}
                        className="flex items-center gap-2 px-2 border-b border-border hover-elevate cursor-pointer"
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
                          style={{
                            backgroundColor: carColor,
                            boxShadow: `0 0 8px ${carColor}66`,
                          }}
                        />
                        <span className="text-sm truncate font-medium">
                          {car.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Scrollable timeline */}
                <div
                  ref={scrollContainerRef}
                  className="flex-1 overflow-x-auto overflow-y-auto neon-scrollbar"
                >
                  <div style={{ width: visibleDays.length * DAY_WIDTH }}>
                    {/* Month headers - sticky */}
                    <div
                      className="flex sticky top-0 z-20 bg-muted/60 backdrop-blur border-b border-border"
                      style={{ height: MONTH_HEADER_HEIGHT }}
                    >
                      {monthGroups.map((group, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-center text-xs font-mono uppercase tracking-wider font-semibold border-r border-border"
                          style={{
                            width: group.days.length * DAY_WIDTH,
                            height: MONTH_HEADER_HEIGHT,
                          }}
                        >
                          {format(group.month, "MMMM yyyy")}
                        </div>
                      ))}
                    </div>

                    {/* Day headers - sticky */}
                    <div
                      className="flex sticky z-20 bg-muted/40 backdrop-blur border-b border-border"
                      style={{ top: MONTH_HEADER_HEIGHT, height: DAY_HEADER_HEIGHT }}
                    >
                      {visibleDays.map((day, idx) => {
                        const isToday = isSameDay(day, new Date());
                        return (
                          <div
                            key={idx}
                            ref={isToday ? todayColumnRef : null}
                            className={`flex items-center justify-center border-r border-border ${
                              isToday ? "bg-neon-cyan/15" : ""
                            }`}
                            style={{ width: DAY_WIDTH, height: DAY_HEADER_HEIGHT }}
                          >
                            <div
                              className={`text-xs font-mono ${
                                isToday
                                  ? "text-neon-cyan font-bold"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {format(day, "EEE")} {format(day, "d")}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {cars?.map((car) => {
                      const bars = getRentalBars(car.id);
                      const carColor = carColorMap.get(car.id) || "#22D3EE";

                      return (
                        <div
                          key={car.id}
                          className="relative flex border-b border-border"
                          style={{ height: CAR_ROW_HEIGHT }}
                        >
                          {visibleDays.map((day, idx) => {
                            const isToday = isSameDay(day, new Date());
                            return (
                              <div
                                key={idx}
                                className={`border-r border-border/50 ${
                                  isToday ? "bg-neon-cyan/[0.07]" : ""
                                }`}
                                style={{ width: DAY_WIDTH, height: CAR_ROW_HEIGHT }}
                              />
                            );
                          })}

                          {bars.map((bar) => {
                            const left = bar.startIndex * DAY_WIDTH;
                            const width =
                              (bar.endIndex - bar.startIndex + 1) * DAY_WIDTH;
                            const pending =
                              bar.rental.paymentStatus === "pending";

                            return (
                              <div
                                key={bar.rental.id}
                                className="absolute cursor-pointer transition-all flex items-center justify-center rounded"
                                style={{
                                  left: left + 2,
                                  top: 4,
                                  width: width - 4,
                                  height: CAR_ROW_HEIGHT - 8,
                                  ...(pending
                                    ? {
                                        backgroundColor: `${carColor}1f`,
                                        border: `1px dashed ${carColor}`,
                                        color: carColor,
                                        boxShadow: `0 0 8px ${carColor}33`,
                                      }
                                    : {
                                        background: `linear-gradient(90deg, ${carColor}, ${carColor}cc)`,
                                        boxShadow: `0 0 10px ${carColor}55`,
                                        color: "#0a0f1a",
                                      }),
                                }}
                                onClick={() => setSelectedRental(bar.rental)}
                                data-testid={`rental-bar-${bar.rental.id}`}
                              >
                                <span className="text-xs font-mono font-bold">
                                  {bar.daysCount}d
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
            </div>
          </div>

          {/* Side panel: Live Feed */}
          <aside className="w-full lg:w-80 mt-6 lg:mt-0 flex-shrink-0 flex flex-col gap-4">
            <div className="glass-panel rounded-md flex-1 p-5 flex flex-col relative overflow-hidden">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-mono text-xs uppercase tracking-widest text-neon-cyan flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-neon-cyan shadow-cyan-glow" />
                  Live Feed
                </h3>
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Recent
                </span>
              </div>

              {activities.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <span className="text-xs font-mono text-muted-foreground">
                    No recent activity yet.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-4 relative">
                  <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />
                  {activities.map((act) => {
                    const Icon = act.icon;
                    const tone = act.tone;
                    const toneClasses =
                      tone === "cyan"
                        ? "bg-neon-cyan/10 border-neon-cyan text-neon-cyan group-hover:shadow-cyan-glow"
                        : tone === "magenta"
                          ? "bg-neon-magenta/10 border-neon-magenta text-neon-magenta group-hover:shadow-magenta-glow"
                          : "bg-muted border-border text-muted-foreground";
                    return (
                      <div
                        key={act.id}
                        className="flex gap-3 relative z-10 group"
                        data-testid={`activity-item-${act.id}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border transition-all ${toneClasses}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0 pt-0.5">
                          <span className="text-sm font-medium truncate">
                            {act.title}
                          </span>
                          <span className="text-xs text-muted-foreground truncate mt-0.5">
                            {act.subtitle}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground/70 mt-1">
                            {act.actor} · {act.time}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
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
