import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfQuarter, endOfQuarter, startOfYear, endOfYear, differenceInDays, max, min, addDays, startOfDay } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { IncomeTrendChart } from "@/components/IncomeTrendChart";
import type { Car, Rental, Expense, MonthlyPayment } from "@shared/schema";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const formatCurrency = (value: number) => {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface KpiTileProps {
  label: string;
  value: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: "cyan" | "magenta" | "amber" | "neutral";
  testid?: string;
}

function KpiTile({ label, value, Icon, accent, testid }: KpiTileProps) {
  const accentMap = {
    cyan: { text: "text-neon-cyan text-glow-cyan", iconBg: "bg-neon-cyan/10 text-neon-cyan", blur: "bg-neon-cyan" },
    magenta: { text: "text-neon-magenta", iconBg: "bg-neon-magenta/10 text-neon-magenta", blur: "bg-neon-magenta" },
    amber: { text: "text-chart-4", iconBg: "bg-chart-4/10 text-chart-4", blur: "bg-chart-4" },
    neutral: { text: "text-foreground", iconBg: "bg-muted text-foreground", blur: "bg-muted-foreground" },
  };
  const a = accentMap[accent];
  return (
    <div className="glass-panel rounded-md p-4 sm:p-5 relative overflow-hidden group" data-testid={testid}>
      <div className={`absolute -right-4 -top-4 w-24 h-24 ${a.blur} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity pointer-events-none`} />
      {/* Stacked at every width so the amount always gets the tile's full
          width. Beside the icon, a six-figure peso value gets truncated on
          phones and on the 4-column grid at tablet/laptop widths. */}
      <div className="flex flex-col gap-2 relative">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md ${a.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className={`text-lg sm:text-xl font-mono font-bold tabular-nums truncate ${a.text}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Finances() {
  const [periodType, setPeriodType] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: cars, isLoading: carsLoading } = useQuery<Car[]>({
    queryKey: ["/api/cars"],
  });

  const { data: rentals, isLoading: rentalsLoading } = useQuery<Rental[]>({
    queryKey: ["/api/rentals"],
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { isLoading: paymentsLoading } = useQuery<MonthlyPayment[]>({
    queryKey: ["/api/monthly-payments", selectedMonth, selectedYear],
  });

  const isLoading = carsLoading || rentalsLoading || expensesLoading || paymentsLoading;

  const getPeriodDates = () => {
    if (periodType === "monthly") {
      const start = startOfMonth(new Date(selectedYear, selectedMonth - 1));
      return { start, end: endOfMonth(start) };
    } else if (periodType === "quarterly") {
      const start = startOfQuarter(new Date(selectedYear, (selectedQuarter - 1) * 3));
      return { start, end: endOfQuarter(start) };
    } else {
      const start = startOfYear(new Date(selectedYear, 0));
      return { start, end: endOfYear(start) };
    }
  };

  const { start: periodStart, end: periodEnd } = getPeriodDates();

  const calculateProratedIncome = (rental: Rental, periodStart: Date, periodEnd: Date): number => {
    const rentalStart = parseISO(rental.startDate as string);
    const rentalEnd = parseISO(rental.endDate as string);
    const totalAmount = parseFloat(rental.totalAmount);

    const totalRentalDays = differenceInDays(rentalEnd, rentalStart);
    if (totalRentalDays <= 0) return totalAmount;

    const dailyRate = totalAmount / totalRentalDays;

    const periodEndExclusive = addDays(startOfDay(periodEnd), 1);
    const overlapStart = max([rentalStart, periodStart]);
    const overlapEnd = min([rentalEnd, periodEndExclusive]);

    if (overlapStart >= overlapEnd) return 0;

    const daysInPeriod = differenceInDays(overlapEnd, overlapStart);

    return dailyRate * daysInPeriod;
  };

  const financialSummary = useMemo(() => {
    if (!rentals || !expenses || !cars) {
      return { totalIncome: 0, totalExpenses: 0, netProfit: 0, totalMonthlyPayments: 0 };
    }

    const confirmedRentals = rentals.filter(r => r.paymentStatus === "confirmed");
    const totalIncome = confirmedRentals.reduce((sum, rental) => {
      return sum + calculateProratedIncome(rental, periodStart, periodEnd);
    }, 0);

    const periodExpenses = expenses.filter((expense) => {
      const expenseDate = parseISO(expense.expenseDate as string);
      return isWithinInterval(expenseDate, { start: periodStart, end: periodEnd });
    });

    const totalExpensesAmount = periodExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    let periodCount = 1;
    if (periodType === "quarterly") {
      periodCount = 3;
    } else if (periodType === "yearly") {
      periodCount = 12;
    }
    const totalMonthlyPayments = cars.reduce((sum, c) => sum + parseFloat(c.monthlyPayment), 0) * periodCount;
    const netProfit = totalIncome - totalMonthlyPayments - totalExpensesAmount;

    return { totalIncome, totalExpenses: totalExpensesAmount, netProfit, totalMonthlyPayments };
  }, [rentals, expenses, cars, periodStart, periodEnd, periodType]);

  const carFinancials = useMemo(() => {
    if (!cars || !rentals || !expenses) return [];

    let periodCount = 1;
    if (periodType === "quarterly") {
      periodCount = 3;
    } else if (periodType === "yearly") {
      periodCount = 12;
    }

    return cars.map((car) => {
      const carRentals = rentals.filter((r) => r.carId === car.id && r.paymentStatus === "confirmed");

      const carExpenses = expenses.filter((e) => {
        const expenseDate = parseISO(e.expenseDate as string);
        return e.carId === car.id && isWithinInterval(expenseDate, { start: periodStart, end: periodEnd });
      });

      const income = carRentals.reduce((sum, r) => {
        return sum + calculateProratedIncome(r, periodStart, periodEnd);
      }, 0);
      const expenseTotal = carExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const monthlyPayment = parseFloat(car.monthlyPayment);
      const totalAmortization = monthlyPayment * periodCount;
      const netProfit = income - expenseTotal;
      const netAfterAmortization = netProfit - totalAmortization;
      const paymentProgress = monthlyPayment > 0 ? Math.min(100, (netProfit / monthlyPayment) * 100) : 0;

      return {
        car,
        income,
        expenses: expenseTotal,
        netProfit,
        netAfterAmortization,
        monthlyPayment,
        totalAmortization,
        paymentProgress,
      };
    });
  }, [cars, rentals, expenses, periodStart, periodEnd, periodType]);

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 h-14 border-b border-border flex-wrap shrink-0 bg-background/60 backdrop-blur">
        <h1
          className="font-mono text-base md:text-lg font-bold uppercase tracking-widest text-foreground"
          data-testid="text-finances-title"
        >
          Finances
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={periodType}
            onValueChange={(v) => setPeriodType(v as "monthly" | "quarterly" | "yearly")}
          >
            <SelectTrigger className="w-32 font-mono text-xs uppercase tracking-wider" data-testid="select-period-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          {periodType === "monthly" && (
            <Select
              value={selectedMonth.toString()}
              onValueChange={(v) => setSelectedMonth(parseInt(v))}
            >
              <SelectTrigger className="w-32 font-mono text-xs uppercase tracking-wider" data-testid="select-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, i) => (
                  <SelectItem key={month} value={(i + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {periodType === "quarterly" && (
            <Select
              value={selectedQuarter.toString()}
              onValueChange={(v) => setSelectedQuarter(parseInt(v))}
            >
              <SelectTrigger className="w-28 font-mono text-xs uppercase tracking-wider" data-testid="select-quarter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Q1</SelectItem>
                <SelectItem value="2">Q2</SelectItem>
                <SelectItem value="3">Q3</SelectItem>
                <SelectItem value="4">Q4</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            <SelectTrigger className="w-24 font-mono text-xs uppercase tracking-wider" data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 neon-scrollbar">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-panel rounded-md p-5">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiTile
                label="Total Income"
                value={`₱${formatCurrency(financialSummary.totalIncome)}`}
                Icon={TrendingUp}
                accent="cyan"
                testid="kpi-total-income"
              />
              <KpiTile
                label="Total Expenses"
                value={`₱${formatCurrency(financialSummary.totalExpenses)}`}
                Icon={TrendingDown}
                accent="magenta"
                testid="kpi-total-expenses"
              />
              <KpiTile
                label="Net Profit"
                value={`₱${formatCurrency(financialSummary.netProfit)}`}
                Icon={DollarSign}
                accent={financialSummary.netProfit >= 0 ? "cyan" : "magenta"}
                testid="kpi-net-profit"
              />
              <KpiTile
                label="Monthly Payments"
                value={`₱${formatCurrency(financialSummary.totalMonthlyPayments)}`}
                Icon={CreditCard}
                accent="amber"
                testid="kpi-monthly-payments"
              />
            </div>

            <div className="mb-6">
              <IncomeTrendChart />
            </div>

            <div className="glass-panel rounded-md mb-6">
              <div className="p-4 border-b border-border">
                <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Monthly Amortization Progress</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Income milestone showing progress toward covering each car's monthly payment
                </p>
              </div>
              <div className="p-4">
                {carFinancials.length > 0 ? (
                  <div className="space-y-6">
                    {carFinancials.map(({ car, netProfit, monthlyPayment, paymentProgress }) => (
                      <div key={car.id} className="space-y-2" data-testid={`car-progress-${car.id}`}>
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: car.colorCode }}
                            />
                            <span className="font-medium">{car.name}</span>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-right">
                              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Net </span>
                              <span className={`font-mono font-medium tabular-nums ${
                                netProfit >= 0 ? "text-neon-cyan" : "text-neon-magenta"
                              }`}>
                                ₱{formatCurrency(netProfit)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Payment </span>
                              <span className="font-mono font-medium tabular-nums text-foreground">
                                ₱{formatCurrency(monthlyPayment)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress
                            value={Math.max(0, Math.min(100, paymentProgress))}
                            className="h-2 flex-1"
                            data-testid={`progress-payment-${car.id}`}
                          />
                          <div className="text-right">
                            <span className={`text-sm font-mono font-bold w-16 tabular-nums ${
                              paymentProgress >= 100
                                ? "text-neon-cyan"
                                : paymentProgress >= 50
                                ? "text-foreground"
                                : "text-chart-4"
                            }`}>
                              {Math.round(paymentProgress)}%
                            </span>
                            {paymentProgress >= 100 && (
                              <div className="text-[10px] font-mono uppercase tracking-widest text-neon-cyan font-medium">Covered</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    No cars to display
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-panel rounded-md">
                <div className="p-4 border-b border-border">
                  <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Income by Car</h2>
                </div>
                <div className="p-2">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Car</TableHead>
                        <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground text-right">Income</TableHead>
                        <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground text-right">Expenses</TableHead>
                        <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground text-right">Amortization</TableHead>
                        <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground text-right">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {carFinancials.map(({ car, income, expenses: expensesVal, netAfterAmortization, totalAmortization }) => (
                        <TableRow key={car.id} className="border-border">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: car.colorCode }}
                              />
                              <span className="font-medium">{car.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-neon-cyan">
                            ₱{formatCurrency(income)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-neon-magenta">
                            ₱{formatCurrency(expensesVal)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-chart-4">
                            ₱{formatCurrency(totalAmortization)}
                          </TableCell>
                          <TableCell className={`text-right font-mono tabular-nums font-medium ${
                            netAfterAmortization >= 0 ? "text-neon-cyan" : "text-neon-magenta"
                          }`}>
                            ₱{formatCurrency(netAfterAmortization)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="glass-panel rounded-md">
                <div className="p-4 border-b border-border">
                  <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Summary</h2>
                </div>
                <div className="p-4 space-y-4">
                  <div className="p-4 rounded-md bg-neon-cyan/10 border border-neon-cyan/20">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs uppercase tracking-widest text-neon-cyan">Total Revenue</span>
                      <span className="text-xl font-mono font-bold tabular-nums text-neon-cyan">
                        ₱{formatCurrency(financialSummary.totalIncome)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-md bg-neon-magenta/10 border border-neon-magenta/20">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs uppercase tracking-widest text-neon-magenta">Total Expenses</span>
                      <span className="text-xl font-mono font-bold tabular-nums text-neon-magenta">
                        -₱{formatCurrency(financialSummary.totalExpenses)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm uppercase tracking-widest text-foreground">Net Profit</span>
                      <span className={`text-2xl font-mono font-bold tabular-nums ${
                        financialSummary.netProfit >= 0
                          ? "text-neon-cyan text-glow-cyan"
                          : "text-neon-magenta"
                      }`}>
                        ₱{formatCurrency(financialSummary.netProfit)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-md bg-card border border-border">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Payment Coverage</span>
                      <span className="font-mono font-medium tabular-nums">
                        {financialSummary.totalMonthlyPayments > 0
                          ? `${Math.round((financialSummary.totalIncome / financialSummary.totalMonthlyPayments) * 100)}%`
                          : "N/A"}
                      </span>
                    </div>
                    <Progress
                      value={
                        financialSummary.totalMonthlyPayments > 0
                          ? Math.min(100, Math.max(0, (financialSummary.totalIncome / financialSummary.totalMonthlyPayments) * 100))
                          : 0
                      }
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {financialSummary.totalIncome >= financialSummary.totalMonthlyPayments
                        ? "All monthly payments covered!"
                        : `₱${formatCurrency(Math.max(0, financialSummary.totalMonthlyPayments - financialSummary.totalIncome))} remaining to cover payments`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
