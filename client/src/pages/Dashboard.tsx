import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  format,
  addDays,
  addMonths,
  subDays,
  isSameDay,
  parseISO,
  differenceInDays,
  eachDayOfInterval,
  isSameMonth,
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
  GripVertical,
  Plus,
  ShieldAlert,
  Wrench,
  Trash2,
} from "lucide-react";
import { useLocation } from "wouter";
import { CreateRentalDialog } from "@/components/CreateRentalDialog";
import { RentalDetailsDialog } from "@/components/RentalDetailsDialog";
import { AvailableCarsDialog } from "@/components/AvailableCarsDialog";
import { CarDetailsDialog } from "@/components/CarDetailsDialog";
import type {
  Car,
  DashboardStats,
  DashboardExceptions,
  Rental,
  RentalLogWithUser,
  ExpenseLogWithUser,
} from "@shared/schema";
import { getOilChangeStatus, formatDaysAge } from "@/lib/oilChange";
import {
  getRentalStatus,
  readableTextOn,
  STATUS_STYLES,
  type RentalStatus,
} from "@/lib/rentalStatus";
import { useTheme } from "@/hooks/useTheme";

// How many days before/after today the Fleet Timeline shows and fetches.
const TIMELINE_DAYS_BEFORE = 60;
const TIMELINE_DAYS_AFTER = 90;

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

function SortableCarRow({
  car,
  carColor,
  rowHeight,
  expanded,
  onToggle,
}: {
  car: Car;
  carColor: string;
  rowHeight: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: car.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        height: rowHeight,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 30 : undefined,
        position: "relative",
      }}
      className={`flex items-center gap-1.5 px-1.5 border-b border-border hover-elevate cursor-pointer ${
        isDragging ? "bg-card shadow-cyan-glow" : ""
      }`}
      onClick={onToggle}
      data-testid={`car-row-${car.id}`}
    >
      <button
        type="button"
        className="flex items-center justify-center flex-shrink-0 text-muted-foreground/60 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none p-0.5"
        onClick={(e) => e.stopPropagation()}
        aria-label={`Drag to reorder ${car.name}`}
        data-testid={`drag-handle-car-${car.id}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <ChevronDown
        className={`h-3 w-3 text-muted-foreground transition-transform flex-shrink-0 ${
          expanded ? "" : "-rotate-90"
        }`}
      />
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{
          backgroundColor: carColor,
          boxShadow: `0 0 8px ${carColor}66`,
        }}
      />
      <span className="text-sm truncate font-medium">{car.name}</span>
    </div>
  );
}

export default function Dashboard() {
  const { skin } = useTheme();
  const [, setLocation] = useLocation();
  const [createRentalOpen, setCreateRentalOpen] = useState(false);
  const [availableCarsOpen, setAvailableCarsOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [expandedCars, setExpandedCars] = useState<Set<number>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayColumnRef = useRef<HTMLDivElement>(null);

  const { data: cars, isLoading: carsLoading } = useQuery<Car[]>({
    queryKey: ["/api/cars"],
  });

  // Drag-to-reorder for the timeline vehicle list. Reordering updates the
  // cache optimistically so the rows (and their rental bars) move instantly,
  // then persists the order server-side.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorderMutation = useMutation({
    mutationFn: async (carIds: number[]) => {
      const res = await apiRequest("POST", "/api/cars/reorder", { carIds });
      return (await res.json()) as Car[];
    },
    onSuccess: (orderedCars) => {
      queryClient.setQueryData(["/api/cars"], orderedCars);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !cars) return;
    const oldIndex = cars.findIndex((c) => c.id === active.id);
    const newIndex = cars.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(cars, oldIndex, newIndex);
    queryClient.setQueryData(["/api/cars"], reordered);
    reorderMutation.mutate(reordered.map((c) => c.id));
  };

  // The timeline only renders a fixed window around today (see `visibleDays`),
  // so we ask the server for just the rentals overlapping that window instead
  // of the full history. Keeping "/api/rentals" as the key prefix means the
  // existing mutation invalidations still refresh this query.
  const timelineWindow = useMemo(() => {
    const t = new Date();
    return {
      from: format(subDays(t, TIMELINE_DAYS_BEFORE), "yyyy-MM-dd"),
      to: format(addDays(t, TIMELINE_DAYS_AFTER), "yyyy-MM-dd"),
    };
  }, []);

  const { data: rentals, isLoading: rentalsLoading } = useQuery<Rental[]>({
    queryKey: ["/api/rentals", timelineWindow],
    queryFn: async () => {
      const res = await fetch(
        `/api/rentals?from=${timelineWindow.from}&to=${timelineWindow.to}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
  });

  // KPI numbers come from a server-computed payload so they stay fast and
  // correct as the rental history grows. See `DashboardStats` for income
  // semantics. We refetch periodically so long-lived sessions don't go stale.
  const { data: dashboardStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 60_000,
  });

  // What needs a person today. Counted server-side across every rental,
  // because the oldest cars still out fall outside the timeline window.
  const { data: exceptions } = useQuery<DashboardExceptions>({
    queryKey: ["/api/dashboard/exceptions"],
    refetchInterval: 60_000,
  });

  const { data: rentalLogs } = useQuery<RentalLogWithUser[]>({
    queryKey: ["/api/rental-logs"],
  });

  const { data: expenseLogs } = useQuery<ExpenseLogWithUser[]>({
    queryKey: ["/api/expense-logs"],
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
  // KPIs are computed in SQL on the server (see `getDashboardStats`). Until
  // the first response arrives we render zeros so the animated counters have
  // a baseline; `cars.length` is used as a fallback for the totals denominator
  // so the "/ N" suffix doesn't flicker when the page first loads.
  const kpis = useMemo(() => {
    if (dashboardStats) return dashboardStats;
    return {
      activeRentals: 0,
      todayIncome: 0,
      monthIncome: 0,
      lastMonthIncome: 0,
      yearToDateIncome: 0,
      availableCars: 0,
      totalCars: cars?.length ?? 0,
    };
  }, [dashboardStats, cars]);

  const animActive = useAnimatedNumber(kpis.activeRentals);
  const animToday = useAnimatedNumber(kpis.todayIncome);
  const animMonth = useAnimatedNumber(kpis.monthIncome);
  const animAvailable = useAnimatedNumber(kpis.availableCars);
  const animYtd = useAnimatedNumber(kpis.yearToDateIncome);

  // Activity feed: mixes rental logs, expense logs, and derived ops alerts
  // (oil-change due, OR/CR registration due) into a single recency/urgency-
  // sorted stream capped at 10 items.
  const activities = useMemo(() => {
    type Tone = "cyan" | "magenta" | "muted";
    type ActivityTarget =
      | { type: "car"; carId: number }
      | { type: "rental"; rentalId: number }
      | { type: "expense"; carId: number };
    type Activity = {
      id: string;
      icon: typeof FileText;
      tone: Tone;
      title: string;
      subtitle: string;
      time: string;
      actor: string;
      sortTime: number;
      target?: ActivityTarget;
    };

    const items: Activity[] = [];
    // Use a continuously-fresh "now" for sort baselines so urgency/recency
    // ordering doesn't go stale within a long-lived session. `today` is
    // intentionally day-stable for KPIs, which is too coarse here.
    const now = Date.now();
    const displayName = (u?: { firstName?: string | null; lastName?: string | null; username?: string | null; email?: string | null }) =>
      u?.firstName && u?.lastName
        ? `${u.firstName} ${u.lastName}`
        : u?.username ?? u?.email ?? "Someone";

    // Rental log items
    for (const log of rentalLogs ?? []) {
      let icon: typeof FileText = FileText;
      let tone: Tone = "muted";
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

      const ts = log.loggedAt ? new Date(log.loggedAt).getTime() : 0;
      // Only link to the rental detail dialog when the rental still exists
      // (rentalId is null for deletions, and deleted rows won't appear in the
      // rentals list anyway).
      const target: ActivityTarget | undefined =
        log.action !== "deleted" && log.rentalId != null
          ? { type: "rental", rentalId: log.rentalId }
          : undefined;
      items.push({
        id: `rental-${log.id}`,
        icon,
        tone,
        title,
        subtitle: `${log.customerName ?? "—"} / ${log.carName ?? "—"}`,
        time: ts ? formatDistanceToNow(new Date(ts), { addSuffix: true }) : "",
        actor: displayName(log.user),
        sortTime: ts,
        target,
      });
    }

    // Expense log items
    for (const log of expenseLogs ?? []) {
      let icon: typeof FileText = CreditCard;
      let tone: Tone = "muted";
      let title = "Expense updated";

      if (log.action === "created") {
        tone = "cyan";
        title = "Expense logged";
      } else if (log.action === "deleted") {
        icon = Trash2;
        tone = "magenta";
        title = "Expense deleted";
      }

      const amount = log.amount ? ` · ₱${log.amount}` : "";
      const subtitle = `${log.category ?? "Expense"}${amount} / ${log.carName ?? "—"}`;
      const ts = log.loggedAt ? new Date(log.loggedAt).getTime() : 0;
      items.push({
        id: `expense-${log.id}`,
        icon,
        tone,
        title,
        subtitle,
        time: ts ? formatDistanceToNow(new Date(ts), { addSuffix: true }) : "",
        actor: displayName(log.user),
        sortTime: ts,
        target: { type: "expense", carId: log.carId },
      });
    }

    // Oil change due alerts: cars whose km since last oil change has met or
    // exceeded the configured interval, OR whose last maintenance date is older
    // than the configured time threshold (catches cars that sit idle).
    for (const car of cars ?? []) {
      const oil = getOilChangeStatus(car, today);
      if (!oil.due) continue;

      const kmStr = `${oil.kmSince.toLocaleString()} km since last change`;
      const timeStr =
        oil.daysSince != null ? `${formatDaysAge(oil.daysSince)} since last change` : null;

      let subtitle = `${car.name} · ${kmStr}`;
      if (oil.reasonKm && oil.reasonTime && timeStr) {
        subtitle = `${car.name} · ${kmStr} / ${timeStr}`;
      } else if (oil.reasonTime && !oil.reasonKm && timeStr) {
        subtitle = `${car.name} · ${timeStr}`;
      }

      let time = "Due now";
      if (oil.reasonKm && oil.kmOverBy > 0) {
        time = `${oil.kmOverBy.toLocaleString()} km overdue`;
      } else if (oil.reasonTime && oil.daysOverBy != null && oil.daysOverBy > 0) {
        time = `${formatDaysAge(oil.daysOverBy)} overdue`;
      }

      // Bias urgency by km-over (1 unit each) and days-over (50 units each, so
      // a couple months idle ranks similar to a few thousand km overdue).
      const urgency = Math.max(oil.kmOverBy, (oil.daysOverBy ?? 0) * 50);
      items.push({
        id: `oil-${car.id}`,
        icon: Wrench,
        tone: "magenta",
        title: "Oil change due",
        subtitle,
        time,
        actor: car.plateNumber ?? car.name,
        // Promote alerts to top of the feed; bias more-overdue cars upward
        // (clamped so a single huge value can't dominate).
        sortTime: now + Math.min(Math.max(urgency, 0), 100_000),
        target: { type: "car", carId: car.id },
      });
    }

    // OR/CR registration alerts: registrations renew yearly, so the next due
    // date is 12 months after `registrationConfirmedAt`. Surface anything
    // due within 30 days or already past due.
    for (const car of cars ?? []) {
      if (!car.registrationConfirmedAt) continue;
      const confirmed = parseISO(car.registrationConfirmedAt as string);
      const due = addMonths(confirmed, 12);
      const days = differenceInDays(due, today);
      if (days > 30) continue;
      const overdue = days < 0;
      const time = overdue
        ? `${Math.abs(days)}d overdue`
        : days === 0
          ? "Due today"
          : `Due in ${days}d`;
      items.push({
        id: `reg-${car.id}`,
        icon: ShieldAlert,
        tone: "magenta",
        title: "OR/CR registration due",
        subtitle: `${car.name} · expires ${format(due, "MMM d, yyyy")}`,
        time,
        actor: car.plateNumber ?? car.name,
        // Bias by urgency: overdue first, then closest-to-due. Each day of
        // urgency is worth one minute of recency boost over now.
        sortTime: now + (overdue ? Math.abs(days) : 30 - days) * 60_000,
        target: { type: "car", carId: car.id },
      });
    }

    items.sort((a, b) => b.sortTime - a.sortTime);
    return items.slice(0, 10);
  }, [rentalLogs, expenseLogs, cars, today]);

  // Scrollable range shown by the timeline; must match the window the rentals
  // query fetches (see `timelineWindow`).
  const visibleDays = useMemo(() => {
    const t = new Date();
    const start = subDays(t, TIMELINE_DAYS_BEFORE);
    const end = addDays(t, TIMELINE_DAYS_AFTER);
    return eachDayOfInterval({ start, end });
  }, []);

  const todayIndex = useMemo(() => {
    const t = new Date();
    return visibleDays.findIndex((day) => isSameDay(day, t));
  }, [visibleDays]);

  // Auto-center the timeline on today once the scroll container exists.
  // The container only mounts after BOTH the cars and rentals queries settle
  // (see `isLoading`), so this effect must re-run on that flip — depending on
  // `cars` alone breaks when cars resolves before rentals (the ref is still
  // null at that point and the effect never fires again).
  const timelineReady = !carsLoading && !rentalsLoading;
  useEffect(() => {
    if (timelineReady && scrollContainerRef.current && todayIndex >= 0) {
      const DAY_WIDTH = 70;
      const scrollPosition = todayIndex * DAY_WIDTH - 100;
      scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [todayIndex, timelineReady]);

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

  // Navigate the user from a Live Feed alert to the right place to act on it.
  // Cars and rentals open their existing detail dialogs in-place; expense
  // logs jump to the Logs page pre-filtered to the affected car so the
  // matching expense entry is easy to find.
  const handleActivityClick = (target: NonNullable<typeof activities[number]["target"]>) => {
    if (target.type === "car") {
      const car = cars?.find((c) => c.id === target.carId);
      if (car) setSelectedCar(car);
    } else if (target.type === "rental") {
      const rental = rentals?.find((r) => r.id === target.rentalId);
      if (rental) setSelectedRental(rental);
    } else if (target.type === "expense") {
      setLocation(`/logs?tab=expenses&carId=${target.carId}`);
    }
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
        // Inclusive of both days: a rental that starts and ends on the same
        // date lasts one day, not zero.
        const daysCount = differenceInDays(rentalEnd, rentalStart) + 1;
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

  // "vs last month" delta for the This Month card. Only shown once server
  // stats have arrived (so we don't flash a bogus -100% while loading) and
  // only when last month had income (so the % is well-defined).
  const monthDelta =
    dashboardStats && dashboardStats.lastMonthIncome > 0
      ? ((dashboardStats.monthIncome - dashboardStats.lastMonthIncome) /
          dashboardStats.lastMonthIncome) *
        100
      : null;

  const kpiCards = [
    {
      label: "Active Rentals",
      value: animActive.toString(),
      suffix: "",
      prefix: "",
      sub: null as string | null,
      subTone: "muted" as "up" | "down" | "muted",
    },
    {
      label: "This Month",
      value: Math.round(animMonth).toLocaleString(),
      prefix: "₱",
      suffix: "",
      sub:
        monthDelta !== null
          ? `${monthDelta >= 0 ? "+" : ""}${monthDelta.toFixed(0)}% vs last mo (₱${Math.round(kpis.lastMonthIncome).toLocaleString()})`
          : dashboardStats
            ? `Last mo ₱${Math.round(kpis.lastMonthIncome).toLocaleString()}`
            : null,
      subTone:
        monthDelta === null ? ("muted" as const) : monthDelta >= 0 ? ("up" as const) : ("down" as const),
    },
    {
      label: "Available Cars",
      value: animAvailable.toString(),
      prefix: "",
      suffix: kpis.totalCars ? ` / ${kpis.totalCars}` : "",
      sub: null,
      subTone: "muted" as const,
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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:flex lg:gap-6 neon-scrollbar min-h-0">
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {/* Needs attention — the work of the day. Each chip jumps to the
                rentals list filtered to those bookings. Rendered only when
                non-zero: a quiet dashboard should be quiet. */}
            {exceptions &&
              (exceptions.overdueCount > 0 ||
                exceptions.dueTodayCount > 0 ||
                exceptions.pickupsTodayCount > 0 ||
                exceptions.unpaidCount > 0) && (
                <div
                  className="flex flex-wrap gap-2 sm:gap-3"
                  data-testid="attention-row"
                >
                  {exceptions.overdueCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setLocation("/rentals?filter=overdue")}
                      className="flex items-center gap-2.5 rounded-md border border-[hsl(var(--status-overdue))] bg-[hsl(var(--status-overdue)/0.12)] px-3.5 py-2.5 text-left hover-elevate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      data-testid="chip-overdue"
                    >
                      <span className="text-xl font-bold ui-figure text-[hsl(var(--status-overdue))]">
                        {exceptions.overdueCount}
                      </span>
                      <span className="text-xs leading-tight">
                        not returned
                        <br />
                        <span className="text-muted-foreground">past end date</span>
                      </span>
                    </button>
                  )}
                  {exceptions.unpaidCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setLocation("/rentals?filter=unpaid")}
                      className="flex items-center gap-2.5 rounded-md border border-[hsl(var(--status-unpaid))] bg-[hsl(var(--status-unpaid)/0.12)] px-3.5 py-2.5 text-left hover-elevate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      data-testid="chip-unpaid"
                    >
                      <span className="text-xl font-bold ui-figure text-[hsl(var(--status-unpaid))]">
                        {exceptions.unpaidCount}
                      </span>
                      <span className="text-xs leading-tight">
                        unpaid
                        <br />
                        <span className="text-muted-foreground">
                          ₱{Math.round(exceptions.unpaidAmount).toLocaleString()} owed
                        </span>
                      </span>
                    </button>
                  )}
                  {exceptions.dueTodayCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setLocation("/rentals?filter=due-today")}
                      className="flex items-center gap-2.5 rounded-md border border-border bg-muted/40 px-3.5 py-2.5 text-left hover-elevate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      data-testid="chip-due-today"
                    >
                      <span className="text-xl font-bold ui-figure">
                        {exceptions.dueTodayCount}
                      </span>
                      <span className="text-xs leading-tight">
                        due back today
                      </span>
                    </button>
                  )}
                  {exceptions.pickupsTodayCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setLocation("/rentals?filter=pickups-today")}
                      className="flex items-center gap-2.5 rounded-md border border-border bg-muted/40 px-3.5 py-2.5 text-left hover-elevate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      data-testid="chip-pickups-today"
                    >
                      <span className="text-xl font-bold ui-figure">
                        {exceptions.pickupsTodayCount}
                      </span>
                      <span className="text-xs leading-tight">
                        pickups today
                      </span>
                    </button>
                  )}
                </div>
              )}

            {/* KPI Row */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {kpiCards.map((kpi, i) => (
                <div
                  key={i}
                  className="glass-panel rounded-md p-5 flex flex-col gap-2 relative overflow-hidden group"
                  data-testid={`kpi-card-${i}`}
                >
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-neon-cyan opacity-5 blur-2xl group-hover:opacity-10 transition-opacity pointer-events-none" />
                  <span className="ui-label">{kpi.label}</span>
                  <div className="flex items-baseline gap-1 mt-auto min-w-0">
                    {kpi.prefix && (
                      <span className="text-base md:text-lg font-mono text-neon-cyan shrink-0">
                        {kpi.prefix}
                      </span>
                    )}
                    {/* Step the size down for longer figures: a full peso
                        amount like 2,144,499 overflows the card at the size a
                        two-digit count is set in. */}
                    <span
                      className={`font-mono font-bold text-neon-cyan text-glow-cyan truncate ${
                        kpi.value.length > 7
                          ? "text-base md:text-lg"
                          : kpi.value.length > 4
                            ? "text-lg md:text-xl"
                            : "text-3xl md:text-4xl"
                      }`}
                    >
                      {kpi.value}
                    </span>
                    {kpi.suffix && (
                      <span className="text-sm font-mono text-muted-foreground ml-1">
                        {kpi.suffix}
                      </span>
                    )}
                  </div>
                  {kpi.sub && (
                    <span
                      className={`text-[10px] font-mono tracking-wider ${
                        kpi.subTone === "up"
                          ? "text-neon-cyan"
                          : kpi.subTone === "down"
                            ? "text-neon-magenta"
                            : "text-muted-foreground"
                      }`}
                      data-testid={`kpi-sub-${i}`}
                    >
                      {kpi.sub}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Fleet Timeline */}
            <div className="glass-panel rounded-md flex-1 flex flex-col min-h-[400px] overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 flex-wrap shrink-0">
                <h2 className="ui-label">Fleet Timeline</h2>
                {skin !== "classic" && (
                  <ul className="flex items-center gap-3 flex-wrap list-none m-0 p-0 mr-auto ml-2">
                    {(
                      ["out", "reserved", "overdue", "unpaid"] as RentalStatus[]
                    ).map((s) => (
                      <li
                        key={s}
                        className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground"
                      >
                        <span
                          aria-hidden="true"
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={
                            STATUS_STYLES[s].outlined
                              ? { border: `1px dashed ${STATUS_STYLES[s].color}` }
                              : { background: STATUS_STYLES[s].color }
                          }
                        />
                        {STATUS_STYLES[s].label}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollByDays(-7)}
                    aria-label="Scroll timeline back one week"
                    data-testid="button-scroll-prev"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollByDays(7)}
                    aria-label="Scroll timeline forward one week"
                    data-testid="button-scroll-next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex">
                {/* Single scroll container: the vehicle column is sticky-left
                    and the headers sticky-top, so rows always stay aligned
                    no matter how the timeline is scrolled (fixes small-screen
                    misalignment where the left column didn't scroll with the
                    rows). */}
                <div
                  ref={scrollContainerRef}
                  className="flex-1 overflow-x-auto overflow-y-auto neon-scrollbar"
                >
                  <div
                    style={{
                      width: CAR_LABEL_WIDTH + visibleDays.length * DAY_WIDTH,
                    }}
                  >
                    {/* Month headers - sticky top */}
                    <div
                      className="flex sticky top-0 z-[60] bg-muted/60 backdrop-blur border-b border-border"
                      style={{ height: MONTH_HEADER_HEIGHT }}
                    >
                      <div
                        className="sticky left-0 z-[70] flex-shrink-0 bg-background border-r border-border"
                        style={{ width: CAR_LABEL_WIDTH, height: MONTH_HEADER_HEIGHT }}
                      />
                      {monthGroups.map((group, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-center text-xs font-mono uppercase tracking-wider font-semibold border-r border-border flex-shrink-0"
                          style={{
                            width: group.days.length * DAY_WIDTH,
                            height: MONTH_HEADER_HEIGHT,
                          }}
                        >
                          {format(group.month, "MMMM yyyy")}
                        </div>
                      ))}
                    </div>

                    {/* Day headers - sticky top */}
                    <div
                      className="flex sticky z-[60] bg-muted/40 backdrop-blur border-b border-border"
                      style={{ top: MONTH_HEADER_HEIGHT, height: DAY_HEADER_HEIGHT }}
                    >
                      <div
                        className="sticky left-0 z-[70] flex-shrink-0 bg-background border-r border-border px-3 flex items-center"
                        style={{ width: CAR_LABEL_WIDTH, height: DAY_HEADER_HEIGHT }}
                      >
                        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                          Vehicle
                        </span>
                      </div>
                      {visibleDays.map((day, idx) => {
                        const isToday = isSameDay(day, new Date());
                        return (
                          <div
                            key={idx}
                            ref={isToday ? todayColumnRef : null}
                            className={`flex items-center justify-center border-r border-border flex-shrink-0 ${
                              isToday ? "bg-neon-cyan/15" : ""
                            }`}
                            style={{ width: DAY_WIDTH, height: DAY_HEADER_HEIGHT }}
                          >
                            <div
                              className={`text-xs font-mono whitespace-nowrap ${
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

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={cars?.map((c) => c.id) ?? []}
                        strategy={verticalListSortingStrategy}
                      >
                        {cars?.map((car) => {
                          const bars = getRentalBars(car.id);
                          const carColor = carColorMap.get(car.id) || "#22D3EE";

                          return (
                            <div
                              key={car.id}
                              className="flex border-b border-border"
                              style={{ height: CAR_ROW_HEIGHT }}
                            >
                              <div
                                className="sticky left-0 z-40 flex-shrink-0 bg-background border-r border-border"
                                style={{ width: CAR_LABEL_WIDTH, height: CAR_ROW_HEIGHT }}
                              >
                                <SortableCarRow
                                  car={car}
                                  carColor={carColor}
                                  rowHeight={CAR_ROW_HEIGHT}
                                  expanded={expandedCars.has(car.id)}
                                  onToggle={() => toggleCarExpanded(car.id)}
                                />
                              </div>
                              <div
                                className="relative flex"
                                style={{
                                  width: visibleDays.length * DAY_WIDTH,
                                  height: CAR_ROW_HEIGHT,
                                }}
                              >
                                {/* A real "now" rule. The cell tint alone
                                    measured 1.15:1 against its neighbours —
                                    not perceivable on the one view whose whole
                                    job is showing where today sits. */}
                                {todayIndex >= 0 && (
                                  <div
                                    aria-hidden="true"
                                    className="absolute top-0 bottom-0 w-0.5 bg-neon-cyan z-10 pointer-events-none"
                                    style={{ left: todayIndex * DAY_WIDTH }}
                                  />
                                )}
                          {visibleDays.map((day, idx) => {
                            const isToday = isSameDay(day, new Date());
                            return (
                              <div
                                key={idx}
                                className={`border-r border-border/50 flex-shrink-0 ${
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
                            const status = getRentalStatus(bar.rental);
                            const style = STATUS_STYLES[status];
                            // Classic keeps vehicle-coloured bars; the other
                            // skins spend colour on status, which the row
                            // label cannot already tell you.
                            const fill =
                              skin === "classic" ? carColor : style.color;
                            const outlined =
                              skin === "classic"
                                ? bar.rental.paymentStatus === "pending"
                                : style.outlined;
                            const label = `${bar.rental.customerName ?? "Rental"} · ${
                              bar.daysCount
                            } day${bar.daysCount === 1 ? "" : "s"} · ${style.label}`;

                            return (
                              <button
                                type="button"
                                key={bar.rental.id}
                                className="absolute cursor-pointer flex items-center justify-center gap-1 rounded px-1 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                                style={{
                                  left: left + 2,
                                  top: 4,
                                  width: width - 4,
                                  height: CAR_ROW_HEIGHT - 8,
                                  ...(outlined
                                    ? {
                                        backgroundColor:
                                          skin === "classic"
                                            ? `${carColor}1f`
                                            : "transparent",
                                        border: `1px dashed ${fill}`,
                                        color: fill,
                                      }
                                    : {
                                        background: fill,
                                        color:
                                          skin === "classic"
                                            ? readableTextOn(carColor)
                                            : "hsl(var(--background))",
                                      }),
                                }}
                                onClick={() => setSelectedRental(bar.rental)}
                                title={label}
                                aria-label={label}
                                data-testid={`rental-bar-${bar.rental.id}`}
                              >
                                {/* The bar's width already shows the duration,
                                    so it carries the thing that isn't otherwise
                                    visible: who has the car. Status is the
                                    colour (and dashed outline when unpaid). */}
                                <span className="text-[11px] font-medium truncate">
                                  {bar.rental.customerName ?? `${bar.daysCount}d`}
                                </span>
                              </button>
                            );
                          })}
                              </div>
                            </div>
                          );
                        })}
                      </SortableContext>
                    </DndContext>
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
                    // Rows that link somewhere (a car, rental, or filtered
                    // logs view) use `hover-elevate` so it's obvious they're
                    // clickable. Rows without a target (e.g. a deleted
                    // rental's log) stay static so we don't promise an
                    // action we can't deliver.
                    const interactive = !!act.target;
                    const interactiveClasses = interactive
                      ? "cursor-pointer hover-elevate text-left w-full"
                      : "";
                    const content = (
                      <>
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
                      </>
                    );

                    if (interactive && act.target) {
                      return (
                        <button
                          type="button"
                          key={act.id}
                          onClick={() => handleActivityClick(act.target!)}
                          className={`flex gap-3 relative z-10 group rounded-md p-1 -m-1 ${interactiveClasses}`}
                          data-testid={`activity-item-${act.id}`}
                        >
                          {content}
                        </button>
                      );
                    }

                    return (
                      <div
                        key={act.id}
                        className="flex gap-3 relative z-10 group"
                        data-testid={`activity-item-${act.id}`}
                      >
                        {content}
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

      <CarDetailsDialog
        car={selectedCar}
        onClose={() => setSelectedCar(null)}
      />
    </div>
  );
}
