import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Car as CarIcon,
  User as UserIcon,
  ArrowRight,
  ClipboardList,
  History,
  Plus,
  Pencil,
  Trash2,
  Hash,
  Info,
  Receipt,
} from "lucide-react";
import type {
  EditLogWithDetails,
  RentalLogWithUser,
  ExpenseLogWithUser,
} from "@shared/schema";

type LogDetailItem =
  | ({ logType: "car" } & EditLogWithDetails)
  | ({ logType: "rental" } & RentalLogWithUser)
  | ({ logType: "expense" } & ExpenseLogWithUser);

interface LogDetailsDialogProps {
  log: LogDetailItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Car Name",
  model: "Model",
  plateNumber: "Plate Number",
  colorCode: "Color Code",
  monthlyPayment: "Monthly Payment",
  lastOilChangeMileage: "Last Oil Change Mileage",
  oilChangeInterval: "Oil Change Interval",
  oilChangeIntervalKm: "Oil Change Interval (km)",
  oilChangeIntervalDays: "Oil Change Interval (days)",
  dateAcquired: "Date Acquired",
  registrationConfirmedAt: "Registration Confirmed At",
  status: "Status",
  customerName: "Customer Name",
  customerPhone: "Customer Phone",
  customerEmail: "Customer Email",
  startDate: "Start Date",
  endDate: "End Date",
  totalAmount: "Total Amount",
  paymentScreenshotUrl: "Payment Screenshot",
  paymentStatus: "Payment Status",
  notes: "Notes",
  carId: "Car",
  customerId: "Customer",
  category: "Category",
  description: "Description",
  amount: "Amount",
  expenseDate: "Expense Date",
  mileageAtExpense: "Mileage at Expense",
};

function formatFieldName(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatValue(field: string, value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (
    field === "monthlyPayment" ||
    field === "totalAmount" ||
    field.toLowerCase().includes("amount") ||
    field.toLowerCase().includes("payment")
  ) {
    const num = parseFloat(value);
    if (!isNaN(num)) return `₱${num.toLocaleString()}`;
  }
  if (field === "paymentStatus") {
    return value === "confirmed" ? "Confirmed (Paid)" : "Pending (Reservation)";
  }
  return value;
}

function formatAmount(value: string | null | undefined): string {
  if (!value) return "₱0";
  const num = parseFloat(value);
  if (isNaN(num)) return "₱0";
  return `₱${num.toLocaleString()}`;
}

function formatUserName(user: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  id: string;
}): string {
  const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  if (full) return full;
  return user.username || user.id;
}

function getActionBadge(action: string) {
  switch (action) {
    case "created":
      return (
        <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">
          <Plus className="h-3 w-3 mr-1" />
          Created
        </Badge>
      );
    case "updated":
      return (
        <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400">
          <Pencil className="h-3 w-3 mr-1" />
          Updated
        </Badge>
      );
    case "deleted":
      return (
        <Badge className="bg-red-500/20 text-red-600 dark:text-red-400">
          <Trash2 className="h-3 w-3 mr-1" />
          Deleted
        </Badge>
      );
    default:
      return <Badge variant="outline">{action}</Badge>;
  }
}

export function LogDetailsDialog({
  log,
  open,
  onOpenChange,
}: LogDetailsDialogProps) {
  if (!log) return null;

  const isCarLog = log.logType === "car";
  const isRentalLog = log.logType === "rental";
  const isExpenseLog = log.logType === "expense";
  const timestamp = isCarLog
    ? new Date(log.editedAt)
    : new Date(log.loggedAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-log-details">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCarLog ? (
              <>
                <CarIcon className="h-5 w-5" />
                Car Edit Details
              </>
            ) : isRentalLog ? (
              <>
                <ClipboardList className="h-5 w-5" />
                Rental Activity Details
              </>
            ) : (
              <>
                <Receipt className="h-5 w-5" />
                Expense Activity Details
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Complete information about this activity log entry
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 pr-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Log ID
                </div>
                <div className="font-mono text-sm" data-testid="text-log-id">
                  #{log.id}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Date & Time
                </div>
                <div className="text-sm" data-testid="text-log-timestamp">
                  {format(timestamp, "MMM d, yyyy 'at' h:mm:ss a")}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Performed By
              </h4>
              <div className="flex items-center gap-3 rounded-md border p-3">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium" data-testid="text-log-user-name">
                    {formatUserName(log.user)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    @{log.user.username || log.user.id}
                    {log.user.isAdmin && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">
                {isCarLog ? "Car" : isRentalLog ? "Rental Information" : "Expense Information"}
              </h4>
              {isCarLog ? (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <CarIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div
                        className="font-medium"
                        data-testid="text-log-car-name"
                      >
                        {log.car.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.car.model} · {log.car.plateNumber}
                      </div>
                    </div>
                  </div>
                </div>
              ) : isRentalLog ? (
                <div className="rounded-md border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CarIcon className="h-4 w-4 text-muted-foreground" />
                      <span
                        className="font-medium"
                        data-testid="text-log-car-name"
                      >
                        {log.carName || "(unknown)"}
                      </span>
                    </div>
                    {getActionBadge(log.action)}
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Customer
                      </div>
                      <div
                        className="font-medium"
                        data-testid="text-log-customer"
                      >
                        {log.customerName || "(none)"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Total Amount
                      </div>
                      <div
                        className="font-medium"
                        data-testid="text-log-amount"
                      >
                        {formatAmount(log.totalAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Start Date
                      </div>
                      <div
                        className="font-medium"
                        data-testid="text-log-start-date"
                      >
                        {log.startDate || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        End Date
                      </div>
                      <div
                        className="font-medium"
                        data-testid="text-log-end-date"
                      >
                        {log.endDate || "—"}
                      </div>
                    </div>
                    {log.rentalId && (
                      <div className="col-span-2">
                        <div className="text-xs text-muted-foreground">
                          Rental ID
                        </div>
                        <div
                          className="font-mono text-xs"
                          data-testid="text-log-rental-id"
                        >
                          #{log.rentalId}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CarIcon className="h-4 w-4 text-muted-foreground" />
                      <span
                        className="font-medium"
                        data-testid="text-log-car-name"
                      >
                        {log.carName || "(unknown)"}
                      </span>
                    </div>
                    {getActionBadge(log.action)}
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Category
                      </div>
                      <div
                        className="font-medium"
                        data-testid="text-log-category"
                      >
                        {log.category || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Amount
                      </div>
                      <div
                        className="font-medium"
                        data-testid="text-log-amount"
                      >
                        {formatAmount(log.amount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Expense Date
                      </div>
                      <div
                        className="font-medium"
                        data-testid="text-log-expense-date"
                      >
                        {log.expenseDate || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Mileage
                      </div>
                      <div
                        className="font-medium"
                        data-testid="text-log-mileage"
                      >
                        {log.mileageAtExpense
                          ? `${parseFloat(log.mileageAtExpense).toLocaleString()} km`
                          : "—"}
                      </div>
                    </div>
                    {log.description && (
                      <div className="col-span-2">
                        <div className="text-xs text-muted-foreground">
                          Description
                        </div>
                        <div
                          className="text-sm"
                          data-testid="text-log-description"
                        >
                          {log.description}
                        </div>
                      </div>
                    )}
                    {log.expenseId && (
                      <div className="col-span-2">
                        <div className="text-xs text-muted-foreground">
                          Expense ID
                        </div>
                        <div
                          className="font-mono text-xs"
                          data-testid="text-log-expense-id"
                        >
                          #{log.expenseId}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                <Info className="h-4 w-4" />
                Change Details
              </h4>

              {isCarLog ? (
                <div className="rounded-md border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Field changed:
                    </span>
                    <Badge variant="outline" data-testid="text-log-field">
                      {formatFieldName(log.fieldName)}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Previous Value
                      </div>
                      <div
                        className="rounded-md bg-muted/50 px-3 py-2 text-sm break-all"
                        data-testid="text-log-old-value"
                      >
                        {formatValue(log.fieldName, log.oldValue)}
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        New Value
                      </div>
                      <div
                        className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium break-all"
                        data-testid="text-log-new-value"
                      >
                        {formatValue(log.fieldName, log.newValue)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : isRentalLog ? (
                <div className="rounded-md border p-3 space-y-3">
                  {log.action === "created" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Plus className="h-4 w-4 text-green-500" />
                        <span>
                          New rental was created for{" "}
                          <strong>{log.customerName || "(unknown)"}</strong> on{" "}
                          <strong>{log.carName || "(unknown)"}</strong> from{" "}
                          <strong>{log.startDate || "—"}</strong> to{" "}
                          <strong>{log.endDate || "—"}</strong> for{" "}
                          <strong>{formatAmount(log.totalAmount)}</strong>
                          .
                        </span>
                      </div>
                    </div>
                  )}
                  {log.action === "deleted" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Trash2 className="h-4 w-4 text-red-500" />
                        <span>
                          Rental for{" "}
                          <strong>{log.customerName || "(unknown)"}</strong> on{" "}
                          <strong>{log.carName || "(unknown)"}</strong> from{" "}
                          <strong>{log.startDate || "—"}</strong> to{" "}
                          <strong>{log.endDate || "—"}</strong> (
                          <strong>{formatAmount(log.totalAmount)}</strong>
                          ) was deleted.
                        </span>
                      </div>
                    </div>
                  )}
                  {log.action === "updated" && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Field changed:
                        </span>
                        <Badge
                          variant="outline"
                          data-testid="text-log-field"
                        >
                          {formatFieldName(log.fieldName || "")}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Previous Value
                          </div>
                          <div
                            className="rounded-md bg-muted/50 px-3 py-2 text-sm break-all"
                            data-testid="text-log-old-value"
                          >
                            {formatValue(
                              log.fieldName || "",
                              log.oldValue,
                            )}
                          </div>
                        </div>
                        <div className="flex justify-center">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            New Value
                          </div>
                          <div
                            className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium break-all"
                            data-testid="text-log-new-value"
                          >
                            {formatValue(
                              log.fieldName || "",
                              log.newValue,
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-md border p-3 space-y-3">
                  {log.action === "created" && (
                    <div className="flex items-center gap-2 text-sm">
                      <Plus className="h-4 w-4 text-green-500" />
                      <span>
                        New <strong>{log.category || "expense"}</strong> expense
                        of <strong>{formatAmount(log.amount)}</strong> was
                        recorded for{" "}
                        <strong>{log.carName || "(unknown)"}</strong>
                        {log.expenseDate ? (
                          <>
                            {" "}on <strong>{log.expenseDate}</strong>
                          </>
                        ) : null}
                        {log.description ? (
                          <>
                            {" "}— {log.description}
                          </>
                        ) : null}
                        .
                      </span>
                    </div>
                  )}
                  {log.action === "deleted" && (
                    <div className="flex items-center gap-2 text-sm">
                      <Trash2 className="h-4 w-4 text-red-500" />
                      <span>
                        <strong>{log.category || "Expense"}</strong> expense of{" "}
                        <strong>{formatAmount(log.amount)}</strong> for{" "}
                        <strong>{log.carName || "(unknown)"}</strong>
                        {log.expenseDate ? (
                          <>
                            {" "}({log.expenseDate})
                          </>
                        ) : null}
                        {" "}was deleted.
                      </span>
                    </div>
                  )}
                  {log.action === "updated" && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Field changed:
                        </span>
                        <Badge
                          variant="outline"
                          data-testid="text-log-field"
                        >
                          {formatFieldName(log.fieldName || "")}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Previous Value
                          </div>
                          <div
                            className="rounded-md bg-muted/50 px-3 py-2 text-sm break-all"
                            data-testid="text-log-old-value"
                          >
                            {formatValue(log.fieldName || "", log.oldValue)}
                          </div>
                        </div>
                        <div className="flex justify-center">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            New Value
                          </div>
                          <div
                            className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium break-all"
                            data-testid="text-log-new-value"
                          >
                            {formatValue(log.fieldName || "", log.newValue)}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
              <div className="flex items-center gap-1">
                <History className="h-3 w-3" />
                <span>
                  Logged{" "}
                  {format(timestamp, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
