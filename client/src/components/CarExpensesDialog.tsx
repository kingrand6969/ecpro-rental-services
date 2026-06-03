import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, differenceInMonths } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Car, Expense, Rental } from "@shared/schema";

const EXPENSE_CATEGORIES = [
  "Fuel",
  "Oil Change",
  "Maintenance",
  "Repair",
  "Insurance",
  "Registration",
  "Cleaning",
  "Tires",
  "Other",
];

const expenseSchema = z.object({
  category: z.string().min(1, "Kind of expense is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be a positive number"),
  mileageAtExpense: z.string().optional(),
  expenseDate: z.string().min(1, "Date is required"),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface CarExpensesDialogProps {
  carId: number | null;
  onClose: () => void;
}

export function CarExpensesDialog({ carId, onClose }: CarExpensesDialogProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("list");
  const [incomeFrom, setIncomeFrom] = useState("");
  const [incomeTo, setIncomeTo] = useState("");

  const { data: car } = useQuery<Car>({
    queryKey: ["/api/cars", carId],
    enabled: !!carId,
  });

  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/cars", carId, "expenses"],
    enabled: !!carId,
  });

  const { data: allRentals } = useQuery<Rental[]>({
    queryKey: ["/api/rentals"],
    enabled: !!carId,
  });

  useEffect(() => {
    setIncomeFrom("");
    setIncomeTo("");
  }, [carId]);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: "",
      description: "",
      amount: "",
      mileageAtExpense: "",
      expenseDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const payload = {
        carId,
        category: data.category,
        description: data.description,
        amount: data.amount,
        mileageAtExpense: data.mileageAtExpense ? parseInt(data.mileageAtExpense) : null,
        expenseDate: data.expenseDate,
      };
      await apiRequest("POST", "/api/expenses", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars", carId, "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
      form.reset({
        category: "",
        description: "",
        amount: "",
        mileageAtExpense: "",
        expenseDate: format(new Date(), "yyyy-MM-dd"),
      });
      setActiveTab("list");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (expenseId: number) => {
      await apiRequest("DELETE", `/api/expenses/${expenseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars", carId, "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    createMutation.mutate(data);
  };

  const totalExpenses = expenses?.reduce((sum, e) => sum + parseFloat(e.amount), 0) ?? 0;

  const carRentals = (allRentals ?? [])
    .filter((r) => r.carId === carId && r.paymentStatus === "confirmed")
    .filter((r) => {
      const start = r.startDate as string;
      if (incomeFrom && start < incomeFrom) return false;
      if (incomeTo && start > incomeTo) return false;
      return true;
    })
    .sort((a, b) => (a.startDate as string).localeCompare(b.startDate as string));
  const totalIncome = carRentals.reduce((sum, r) => sum + parseFloat(r.totalAmount), 0);

  const confirmedCarRentals = (allRentals ?? []).filter(
    (r) => r.carId === carId && r.paymentStatus === "confirmed",
  );
  const allCarRentalsIncome = confirmedCarRentals.reduce(
    (sum, r) => sum + parseFloat(r.totalAmount),
    0,
  );

  // Monthly amortization = car.monthlyPayment × number of months the car has
  // been in operation (since dateAcquired, falling back to earliest activity).
  const monthlyPayment = car ? parseFloat(car.monthlyPayment) : 0;
  const monthsOwned = (() => {
    let startStr: string | null = (car?.dateAcquired as string) ?? null;
    if (!startStr) {
      const activityDates = [
        ...(allRentals ?? [])
          .filter((r) => r.carId === carId)
          .map((r) => r.startDate as string),
        ...(expenses ?? []).map((e) => e.expenseDate as string),
      ]
        .filter(Boolean)
        .sort();
      startStr = activityDates[0] ?? null;
    }
    if (!startStr) return 1;
    return Math.max(1, differenceInMonths(new Date(), parseISO(startStr)) + 1);
  })();
  const totalAmortization = monthlyPayment * monthsOwned;

  const netProfit = allCarRentalsIncome - totalExpenses - totalAmortization;
  const isIncomeFiltered = !!incomeFrom || !!incomeTo;

  return (
    <Dialog open={!!carId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-base uppercase tracking-widest">
            {car?.name} • Income & Expenses
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-md border border-neon-cyan/30 bg-neon-cyan/5 p-3" data-testid="summary-car-income">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block">Income</span>
            <span className="font-bold tabular-nums text-neon-cyan">₱{allCarRentalsIncome.toLocaleString()}</span>
          </div>
          <div className="rounded-md border border-neon-magenta/30 bg-neon-magenta/5 p-3" data-testid="summary-car-expenses">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block">Expenses</span>
            <span className="font-bold tabular-nums text-neon-magenta">₱{totalExpenses.toLocaleString()}</span>
          </div>
          <div className="rounded-md border border-neon-magenta/30 bg-neon-magenta/5 p-3" data-testid="summary-car-amortization">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block">Amortization</span>
            <span className="font-bold tabular-nums text-neon-magenta">₱{totalAmortization.toLocaleString()}</span>
            <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground block mt-0.5">
              ₱{monthlyPayment.toLocaleString()}/mo × {monthsOwned}
            </span>
          </div>
          <div className={`rounded-md border p-3 ${netProfit >= 0 ? "border-neon-cyan/30 bg-neon-cyan/5" : "border-neon-magenta/30 bg-neon-magenta/5"}`} data-testid="summary-car-net">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block">Net Income</span>
            <span className={`font-bold tabular-nums ${netProfit >= 0 ? "text-neon-cyan" : "text-neon-magenta"}`}>₱{netProfit.toLocaleString()}</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="income" data-testid="tab-income-list" className="font-mono text-xs uppercase tracking-wider">
              Income
            </TabsTrigger>
            <TabsTrigger value="list" data-testid="tab-expenses-list" className="font-mono text-xs uppercase tracking-wider">
              Expenses
            </TabsTrigger>
            <TabsTrigger value="add" data-testid="tab-add-expense" className="font-mono text-xs uppercase tracking-wider">
              Add Expense
            </TabsTrigger>
          </TabsList>

          <TabsContent value="income" className="mt-4">
            <div className="flex items-end gap-3 flex-wrap mb-4">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">From</span>
                <Input
                  type="date"
                  value={incomeFrom}
                  max={incomeTo || undefined}
                  onChange={(e) => setIncomeFrom(e.target.value)}
                  className="w-40"
                  data-testid="input-income-from"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">To</span>
                <Input
                  type="date"
                  value={incomeTo}
                  min={incomeFrom || undefined}
                  onChange={(e) => setIncomeTo(e.target.value)}
                  className="w-40"
                  data-testid="input-income-to"
                />
              </div>
              {isIncomeFiltered && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setIncomeFrom(""); setIncomeTo(""); }}
                  className="font-mono text-xs uppercase tracking-wider"
                  data-testid="button-clear-income-filter"
                >
                  Clear
                </Button>
              )}
            </div>
            {carRentals.length > 0 ? (
              <>
                <div className="rounded-md border border-neon-cyan/30 bg-neon-cyan/5 p-3 mb-4 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    {isIncomeFiltered ? "Income (Selected Range)" : "Total Income (Confirmed)"}
                  </span>
                  <span className="font-bold tabular-nums text-neon-cyan">₱{totalIncome.toLocaleString()}</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Period</TableHead>
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Customer</TableHead>
                      <TableHead className="text-right font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carRentals.map((rental) => (
                      <TableRow key={rental.id} data-testid={`income-row-${rental.id}`}>
                        <TableCell className="text-muted-foreground tabular-nums whitespace-nowrap">
                          {format(parseISO(rental.startDate as string), "MMM d")} – {format(parseISO(rental.endDate as string), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{rental.customerName}</TableCell>
                        <TableCell className="text-right tabular-nums font-bold text-neon-cyan">
                          ₱{parseFloat(rental.totalAmount).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-border bg-card text-center py-8 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {isIncomeFiltered
                  ? "No confirmed income in the selected date range"
                  : "No confirmed rental income for this car yet"}
              </div>
            )}
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : expenses && expenses.length > 0 ? (
              <>
                <div className="rounded-md border border-neon-magenta/30 bg-neon-magenta/5 p-3 mb-4 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Total Expenses</span>
                  <span className="font-bold tabular-nums text-neon-magenta">₱{totalExpenses.toLocaleString()}</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Date</TableHead>
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Category</TableHead>
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Description</TableHead>
                      <TableHead className="text-right font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Amount</TableHead>
                      <TableHead className="text-right font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Mileage</TableHead>
                      {isAdmin && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id} data-testid={`expense-row-${expense.id}`}>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {format(parseISO(expense.expenseDate as string), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest border-neon-magenta/40 bg-neon-magenta/10 text-neon-magenta">{expense.category}</Badge>
                        </TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell className="text-right tabular-nums font-bold text-neon-magenta">
                          ₱{parseFloat(expense.amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {expense.mileageAtExpense?.toLocaleString() ?? "-"}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(expense.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-expense-${expense.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-border bg-card text-center py-8 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                No expenses recorded for this car
              </div>
            )}
          </TabsContent>

          <TabsContent value="add" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-expense-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Regular oil change at 50,000km"
                          {...field}
                          data-testid="input-expense-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Amount (₱)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            data-testid="input-expense-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expenseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-expense-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="mileageAtExpense"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Mileage at Time of Expense (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="e.g., 50000"
                          {...field}
                          data-testid="input-expense-mileage"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("list")}
                    className="flex-1 font-mono text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
                    disabled={createMutation.isPending}
                    data-testid="button-save-expense"
                  >
                    {createMutation.isPending ? "Adding..." : "Add Expense"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
