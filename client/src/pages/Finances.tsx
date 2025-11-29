import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
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

export default function Finances() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
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

  const periodStart = startOfMonth(new Date(selectedYear, selectedMonth - 1));
  const periodEnd = endOfMonth(periodStart);

  const financialSummary = useMemo(() => {
    if (!rentals || !expenses || !cars) {
      return { totalIncome: 0, totalExpenses: 0, netProfit: 0, totalMonthlyPayments: 0 };
    }

    const periodRentals = rentals.filter((rental) => {
      const startDate = parseISO(rental.startDate as string);
      return isWithinInterval(startDate, { start: periodStart, end: periodEnd });
    });

    const periodExpenses = expenses.filter((expense) => {
      const expenseDate = parseISO(expense.expenseDate as string);
      return isWithinInterval(expenseDate, { start: periodStart, end: periodEnd });
    });

    const totalIncome = periodRentals.reduce((sum, r) => sum + parseFloat(r.totalAmount), 0);
    const totalExpenses = periodExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalMonthlyPayments = cars.reduce((sum, c) => sum + parseFloat(c.monthlyPayment), 0);
    const netProfit = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, netProfit, totalMonthlyPayments };
  }, [rentals, expenses, cars, periodStart, periodEnd]);

  const carFinancials = useMemo(() => {
    if (!cars || !rentals || !expenses) return [];

    return cars.map((car) => {
      const carRentals = rentals.filter((r) => {
        const startDate = parseISO(r.startDate as string);
        return r.carId === car.id && isWithinInterval(startDate, { start: periodStart, end: periodEnd });
      });

      const carExpenses = expenses.filter((e) => {
        const expenseDate = parseISO(e.expenseDate as string);
        return e.carId === car.id && isWithinInterval(expenseDate, { start: periodStart, end: periodEnd });
      });

      const income = carRentals.reduce((sum, r) => sum + parseFloat(r.totalAmount), 0);
      const expenseTotal = carExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const monthlyPayment = parseFloat(car.monthlyPayment);
      const netProfit = income - expenseTotal;
      const paymentProgress = monthlyPayment > 0 ? Math.min(100, (netProfit / monthlyPayment) * 100) : 0;

      return {
        car,
        income,
        expenses: expenseTotal,
        netProfit,
        monthlyPayment,
        paymentProgress,
      };
    });
  }, [cars, rentals, expenses, periodStart, periodEnd]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <h1 className="text-2xl font-semibold">Finances</h1>
        <div className="flex items-center gap-3">
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
                      ${financialSummary.totalIncome.toLocaleString()}
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
                      ${financialSummary.totalExpenses.toLocaleString()}
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
                      ${financialSummary.netProfit.toLocaleString()}
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
                      ${financialSummary.totalMonthlyPayments.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Payment Progress by Car</CardTitle>
              <CardDescription>
                Track how much of each car's monthly payment is covered by net income
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
                              ${netProfit.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-right w-28">
                            <span className="text-muted-foreground">Payment: </span>
                            <span className="font-medium tabular-nums">
                              ${monthlyPayment.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={Math.max(0, paymentProgress)}
                          className="h-2 flex-1"
                        />
                        <span className={`text-sm font-medium w-12 text-right ${
                          paymentProgress >= 100 ? "text-green-600 dark:text-green-400" : ""
                        }`}>
                          {Math.round(paymentProgress)}%
                        </span>
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
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carFinancials.map(({ car, income, expenses, netProfit }) => (
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
                          ${income.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">
                          ${expenses.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${
                          netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}>
                          ${netProfit.toLocaleString()}
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
                        ${financialSummary.totalIncome.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-md bg-red-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-red-700 dark:text-red-300 font-medium">Total Expenses</span>
                      <span className="text-xl font-semibold tabular-nums text-red-600 dark:text-red-400">
                        -${financialSummary.totalExpenses.toLocaleString()}
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
                        ${financialSummary.netProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-md bg-muted mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground">Payment Coverage</span>
                      <span className="font-medium">
                        {financialSummary.totalMonthlyPayments > 0
                          ? `${Math.round((financialSummary.netProfit / financialSummary.totalMonthlyPayments) * 100)}%`
                          : "N/A"}
                      </span>
                    </div>
                    <Progress
                      value={
                        financialSummary.totalMonthlyPayments > 0
                          ? Math.min(100, Math.max(0, (financialSummary.netProfit / financialSummary.totalMonthlyPayments) * 100))
                          : 0
                      }
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {financialSummary.netProfit >= financialSummary.totalMonthlyPayments
                        ? "All monthly payments covered!"
                        : `$${Math.max(0, financialSummary.totalMonthlyPayments - financialSummary.netProfit).toLocaleString()} remaining to cover payments`}
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
