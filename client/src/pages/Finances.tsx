import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfQuarter, endOfQuarter, startOfYear, endOfYear, differenceInDays, max, min, addDays, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  BarChart3,
  Car as CarIcon,
} from "lucide-react";
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

  const { data: monthlyPayments, isLoading: paymentsLoading } = useQuery<MonthlyPayment[]>({
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

    const totalIncome = rentals.reduce((sum, rental) => {
      return sum + calculateProratedIncome(rental, periodStart, periodEnd);
    }, 0);

    const periodExpenses = expenses.filter((expense) => {
      const expenseDate = parseISO(expense.expenseDate as string);
      return isWithinInterval(expenseDate, { start: periodStart, end: periodEnd });
    });

    const totalExpensesAmount = periodExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    // Calculate number of periods for monthly payments
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

    // Calculate number of periods for amortization
    let periodCount = 1;
    if (periodType === "quarterly") {
      periodCount = 3;
    } else if (periodType === "yearly") {
      periodCount = 12;
    }

    return cars.map((car) => {
      const carRentals = rentals.filter((r) => r.carId === car.id);

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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <h1 className="text-2xl font-semibold">Finances</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={periodType}
            onValueChange={(v) => setPeriodType(v as "monthly" | "quarterly" | "yearly")}
          >
            <SelectTrigger className="w-36" data-testid="select-period-type">
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
              <SelectTrigger className="w-36" data-testid="select-month">
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
              <SelectTrigger className="w-36" data-testid="select-quarter">
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
            <SelectTrigger className="w-24" data-testid="select-year">
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

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Income</p>
                    <p className="text-xl font-semibold tabular-nums text-green-600 dark:text-green-400">
                      ₱{formatCurrency(financialSummary.totalIncome)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-red-500/10 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-xl font-semibold tabular-nums text-red-600 dark:text-red-400">
                      ₱{formatCurrency(financialSummary.totalExpenses)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                    <p className={`text-xl font-semibold tabular-nums ${
                      financialSummary.netProfit >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}>
                      ₱{formatCurrency(financialSummary.netProfit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-orange-500/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Payments</p>
                    <p className="text-xl font-semibold tabular-nums">
                      ₱{formatCurrency(financialSummary.totalMonthlyPayments)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Monthly Amortization Progress</CardTitle>
              <CardDescription>
                Income milestone showing progress toward covering each car's monthly payment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {carFinancials.length > 0 ? (
                <div className="space-y-6">
                  {carFinancials.map(({ car, income, expenses, netProfit, monthlyPayment, paymentProgress }) => (
                    <div key={car.id} className="space-y-2" data-testid={`car-progress-${car.id}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: car.colorCode }}
                          />
                          <span className="font-medium">{car.name}</span>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <span className="text-muted-foreground">Net: </span>
                            <span className={`font-medium tabular-nums ${
                              netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            }`}>
                              ₱{formatCurrency(netProfit)}
                            </span>
                          </div>
                          <div className="text-right w-28">
                            <span className="text-muted-foreground">Payment: </span>
                            <span className="font-medium tabular-nums">
                              ₱{formatCurrency(monthlyPayment)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={Math.max(0, Math.min(100, paymentProgress))}
                          className="h-3 flex-1"
                          data-testid={`progress-payment-${car.id}`}
                        />
                        <div className="text-right">
                          <span className={`text-sm font-bold w-16 tabular-nums ${
                            paymentProgress >= 100 
                              ? "text-green-600 dark:text-green-400" 
                              : paymentProgress >= 50
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-orange-600 dark:text-orange-400"
                          }`}>
                            {Math.round(paymentProgress)}%
                          </span>
                          {paymentProgress >= 100 && (
                            <div className="text-xs text-green-600 dark:text-green-400 font-medium">Covered</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No cars to display
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Income by Car</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Car</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Amortization</TableHead>
                      <TableHead className="text-right">Net After Amortization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carFinancials.map(({ car, income, expenses, netAfterAmortization, totalAmortization }) => (
                      <TableRow key={car.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: car.colorCode }}
                            />
                            <span className="font-medium">{car.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-green-600 dark:text-green-400">
                          ₱{formatCurrency(income)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">
                          ₱{formatCurrency(expenses)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-orange-600 dark:text-orange-400">
                          ₱{formatCurrency(totalAmortization)}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${
                          netAfterAmortization >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}>
                          ₱{formatCurrency(netAfterAmortization)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-md bg-green-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-green-700 dark:text-green-300 font-medium">Total Revenue</span>
                      <span className="text-xl font-semibold tabular-nums text-green-600 dark:text-green-400">
                        ₱{formatCurrency(financialSummary.totalIncome)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-md bg-red-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-red-700 dark:text-red-300 font-medium">Total Expenses</span>
                      <span className="text-xl font-semibold tabular-nums text-red-600 dark:text-red-400">
                        -₱{formatCurrency(financialSummary.totalExpenses)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-lg">Net Profit</span>
                      <span className={`text-2xl font-bold tabular-nums ${
                        financialSummary.netProfit >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        ₱{formatCurrency(financialSummary.netProfit)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-md bg-muted mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground">Payment Coverage</span>
                      <span className="font-medium">
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
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
