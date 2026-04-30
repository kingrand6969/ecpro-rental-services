import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Car, User, Calendar, ArrowRight, ClipboardList, Plus, Pencil, Trash2, Receipt } from "lucide-react";
import type { EditLogWithDetails, Car as CarType, RentalLogWithUser, ExpenseLogWithUser } from "@shared/schema";
import { LogDetailsDialog } from "@/components/LogDetailsDialog";

type SelectedLog =
  | ({ logType: "car" } & EditLogWithDetails)
  | ({ logType: "rental" } & RentalLogWithUser)
  | ({ logType: "expense" } & ExpenseLogWithUser)
  | null;

// Read `tab` and `carId` from the URL on first render so links from other
// pages (e.g. the Dashboard's Live Feed) can drop the user straight into a
// pre-filtered view.
function readInitialFiltersFromUrl(): { tab: string; carId: string } {
  if (typeof window === "undefined") return { tab: "all", carId: "all" };
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get("tab");
  const carIdParam = params.get("carId");
  const allowedTabs = new Set(["all", "cars", "rentals", "expenses"]);
  return {
    tab: tabParam && allowedTabs.has(tabParam) ? tabParam : "all",
    carId: carIdParam && /^\d+$/.test(carIdParam) ? carIdParam : "all",
  };
}

export default function Logs() {
  const initialFilters = readInitialFiltersFromUrl();
  const [selectedCarId, setSelectedCarId] = useState<string>(initialFilters.carId);
  const [activeTab, setActiveTab] = useState<string>(initialFilters.tab);
  const [selectedLog, setSelectedLog] = useState<SelectedLog>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openLogDetails = (log: NonNullable<SelectedLog>) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const { data: cars, isLoading: carsLoading } = useQuery<CarType[]>({
    queryKey: ["/api/cars"],
  });

  const { data: editLogs, isLoading: editLogsLoading } = useQuery<EditLogWithDetails[]>({
    queryKey: ["/api/edit-logs"],
  });

  const { data: rentalLogs, isLoading: rentalLogsLoading } = useQuery<RentalLogWithUser[]>({
    queryKey: ["/api/rental-logs"],
  });

  const { data: expenseLogs, isLoading: expenseLogsLoading } = useQuery<ExpenseLogWithUser[]>({
    queryKey: ["/api/expense-logs"],
  });

  const filteredEditLogs = editLogs?.filter(log =>
    selectedCarId === "all" || log.carId === parseInt(selectedCarId)
  ) || [];

  const filteredRentalLogs = rentalLogs?.filter(log =>
    selectedCarId === "all" || log.carId === parseInt(selectedCarId)
  ) || [];

  const filteredExpenseLogs = expenseLogs?.filter(log =>
    selectedCarId === "all" || log.carId === parseInt(selectedCarId)
  ) || [];

  const isLoading = carsLoading || editLogsLoading || rentalLogsLoading || expenseLogsLoading;

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created": return <Plus className="h-4 w-4 text-neon-cyan" />;
      case "updated": return <Pencil className="h-4 w-4 text-foreground" />;
      case "deleted": return <Trash2 className="h-4 w-4 text-neon-magenta" />;
      default: return <History className="h-4 w-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "created":
        return (
          <Badge className="bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan font-mono text-[10px] uppercase tracking-widest hover:bg-neon-cyan/15">
            Created
          </Badge>
        );
      case "updated":
        return (
          <Badge className="bg-muted border border-border text-foreground font-mono text-[10px] uppercase tracking-widest hover:bg-muted">
            Updated
          </Badge>
        );
      case "deleted":
        return (
          <Badge className="bg-neon-magenta/15 border border-neon-magenta/40 text-neon-magenta font-mono text-[10px] uppercase tracking-widest hover:bg-neon-magenta/15">
            Deleted
          </Badge>
        );
      default:
        return <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">{action}</Badge>;
    }
  };

  const totalLogs = (filteredEditLogs?.length || 0) + (filteredRentalLogs?.length || 0) + (filteredExpenseLogs?.length || 0);

  const formatCurrency = (val: string | number | null | undefined) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (num === null || num === undefined || isNaN(num as number)) return "₱0";
    return `₱${(num as number).toLocaleString()}`;
  };

  const headTh = "font-mono text-[11px] uppercase tracking-widest text-muted-foreground";
  const sectionTitle = "font-mono text-xs uppercase tracking-widest text-muted-foreground";

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background text-foreground">
        <div className="flex items-center justify-between gap-4 px-4 md:px-6 h-14 border-b border-border bg-background/60 backdrop-blur shrink-0">
          <h1 className="font-mono text-base md:text-lg font-bold uppercase tracking-widest text-foreground" data-testid="text-page-title">
            Activity Logs
          </h1>
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-6 neon-scrollbar space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 h-14 border-b border-border flex-wrap shrink-0 bg-background/60 backdrop-blur">
        <h1 className="font-mono text-base md:text-lg font-bold uppercase tracking-widest text-foreground flex items-center gap-2" data-testid="text-page-title">
          <History className="h-5 w-5 text-neon-cyan" />
          Activity Logs
        </h1>
        <div className="flex items-center gap-2">
          <span className={sectionTitle}>Filter</span>
          <Select value={selectedCarId} onValueChange={setSelectedCarId}>
            <SelectTrigger className="w-48 font-mono text-xs uppercase tracking-wider" data-testid="select-car-filter">
              <SelectValue placeholder="All Cars" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cars</SelectItem>
              {cars?.map((car) => (
                <SelectItem key={car.id} value={car.id.toString()}>
                  {car.name} ({car.plateNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 neon-scrollbar">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="font-mono text-xs uppercase tracking-wider">
            <TabsTrigger value="all" data-testid="tab-all-logs">
              All ({totalLogs})
            </TabsTrigger>
            <TabsTrigger value="cars" data-testid="tab-car-logs">
              <Car className="h-4 w-4 mr-1" />
              Cars ({filteredEditLogs.length})
            </TabsTrigger>
            <TabsTrigger value="rentals" data-testid="tab-rental-logs">
              <ClipboardList className="h-4 w-4 mr-1" />
              Rentals ({filteredRentalLogs.length})
            </TabsTrigger>
            <TabsTrigger value="expenses" data-testid="tab-expense-logs">
              <Receipt className="h-4 w-4 mr-1" />
              Expenses ({filteredExpenseLogs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="glass-panel rounded-md">
              <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-neon-cyan" />
                  <h2 className={sectionTitle}>All Activity</h2>
                </div>
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  {totalLogs} log{totalLogs !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                {totalLogs === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-4">
                      <History className="h-8 w-8 text-neon-cyan" />
                    </div>
                    <p className="font-mono text-sm uppercase tracking-widest">No logs found</p>
                    <p className="text-sm text-muted-foreground mt-1">Activity will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className={headTh}>Date & Time</TableHead>
                        <TableHead className={headTh}>Type</TableHead>
                        <TableHead className={headTh}>Car</TableHead>
                        <TableHead className={headTh}>User</TableHead>
                        <TableHead className={headTh}>Action</TableHead>
                        <TableHead className={headTh}>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...filteredEditLogs.map(log => ({ ...log, logType: 'car' as const, timestamp: new Date(log.editedAt) })),
                        ...filteredRentalLogs.map(log => ({ ...log, logType: 'rental' as const, timestamp: new Date(log.loggedAt) })),
                        ...filteredExpenseLogs.map(log => ({ ...log, logType: 'expense' as const, timestamp: new Date(log.loggedAt) }))
                      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                       .map((log) => (
                        <TableRow
                          key={`${log.logType}-${log.id}`}
                          data-testid={`row-log-${log.logType}-${log.id}`}
                          className="cursor-pointer hover-elevate border-border"
                          onClick={() => openLogDetails(log as NonNullable<SelectedLog>)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium font-mono text-sm">
                                  {format(log.timestamp, "MMM d, yyyy")}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {format(log.timestamp, "h:mm a")}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.logType === 'car' ? (
                              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest"><Car className="h-3 w-3 mr-1" />Car</Badge>
                            ) : log.logType === 'rental' ? (
                              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest"><ClipboardList className="h-3 w-3 mr-1" />Rental</Badge>
                            ) : (
                              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest"><Receipt className="h-3 w-3 mr-1" />Expense</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <span>{log.logType === 'car' ? log.car.name : log.carName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{log.user.firstName} {log.user.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.logType === 'car' ? (
                              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">{log.fieldName}</Badge>
                            ) : (
                              getActionBadge(log.action)
                            )}
                          </TableCell>
                          <TableCell>
                            {log.logType === 'car' ? (
                              <div className="flex items-center gap-2 max-w-xs">
                                <span className="text-muted-foreground truncate font-mono text-xs" title={log.oldValue || "(empty)"}>
                                  {log.oldValue || "(empty)"}
                                </span>
                                <ArrowRight className="h-4 w-4 flex-shrink-0 text-neon-cyan" />
                                <span className="font-medium truncate font-mono text-xs text-foreground" title={log.newValue || "(empty)"}>
                                  {log.newValue || "(empty)"}
                                </span>
                              </div>
                            ) : log.logType === 'rental' ? (
                              <div className="text-sm">
                                {log.action === 'updated' && log.fieldName ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs font-mono">{log.fieldName}</Badge>
                                    <span className="text-muted-foreground truncate font-mono text-xs">{log.oldValue || "(empty)"}</span>
                                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-neon-cyan" />
                                    <span className="font-medium truncate font-mono text-xs">{log.newValue || "(empty)"}</span>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="font-medium">{log.customerName}</span>
                                    <span className="text-muted-foreground ml-2 font-mono text-xs">
                                      {log.startDate} → {log.endDate}
                                    </span>
                                    <span className="ml-2 font-mono text-neon-cyan tabular-nums">₱{parseFloat(log.totalAmount || '0').toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm">
                                {log.action === 'updated' && log.fieldName ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs font-mono">{log.fieldName}</Badge>
                                    <span className="text-muted-foreground truncate font-mono text-xs">{log.oldValue || "(empty)"}</span>
                                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-neon-cyan" />
                                    <span className="font-medium truncate font-mono text-xs">{log.newValue || "(empty)"}</span>
                                  </div>
                                ) : (
                                  <div>
                                    <Badge variant="secondary" className="text-xs mr-2 font-mono">{log.category}</Badge>
                                    {log.description && (
                                      <span className="text-muted-foreground mr-2 truncate">{log.description}</span>
                                    )}
                                    <span className="font-mono font-medium text-neon-magenta tabular-nums">{formatCurrency(log.amount)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cars" className="mt-4">
            <div className="glass-panel rounded-md">
              <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-neon-cyan" />
                  <h2 className={sectionTitle}>Car Edit History</h2>
                </div>
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  {filteredEditLogs.length} edit{filteredEditLogs.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                {filteredEditLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-4">
                      <History className="h-8 w-8 text-neon-cyan" />
                    </div>
                    <p className="font-mono text-sm uppercase tracking-widest">No car edit logs</p>
                    <p className="text-sm text-muted-foreground mt-1">Changes to car information will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className={headTh}>Date & Time</TableHead>
                        <TableHead className={headTh}>Car</TableHead>
                        <TableHead className={headTh}>User</TableHead>
                        <TableHead className={headTh}>Field</TableHead>
                        <TableHead className={headTh}>Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEditLogs.map((log) => (
                        <TableRow
                          key={log.id}
                          data-testid={`row-car-log-${log.id}`}
                          className="cursor-pointer hover-elevate border-border"
                          onClick={() => openLogDetails({ ...log, logType: "car" })}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium font-mono text-sm">
                                  {format(new Date(log.editedAt), "MMM d, yyyy")}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {format(new Date(log.editedAt), "h:mm a")}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{log.car.name}</div>
                                <div className="text-xs text-muted-foreground font-mono">{log.car.plateNumber}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{log.user.firstName} {log.user.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">{log.fieldName}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 max-w-xs">
                              <span className="text-muted-foreground truncate font-mono text-xs" title={log.oldValue || "(empty)"}>
                                {log.oldValue || "(empty)"}
                              </span>
                              <ArrowRight className="h-4 w-4 flex-shrink-0 text-neon-cyan" />
                              <span className="font-medium truncate font-mono text-xs" title={log.newValue || "(empty)"}>
                                {log.newValue || "(empty)"}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rentals" className="mt-4">
            <div className="glass-panel rounded-md">
              <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-neon-cyan" />
                  <h2 className={sectionTitle}>Rental Activity</h2>
                </div>
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  {filteredRentalLogs.length} action{filteredRentalLogs.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                {filteredRentalLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-4">
                      <ClipboardList className="h-8 w-8 text-neon-cyan" />
                    </div>
                    <p className="font-mono text-sm uppercase tracking-widest">No rental logs</p>
                    <p className="text-sm text-muted-foreground mt-1">Rental create, update, and delete actions will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className={headTh}>Date & Time</TableHead>
                        <TableHead className={headTh}>Action</TableHead>
                        <TableHead className={headTh}>Car</TableHead>
                        <TableHead className={headTh}>User</TableHead>
                        <TableHead className={headTh}>Customer</TableHead>
                        <TableHead className={headTh}>Period</TableHead>
                        <TableHead className={headTh}>Amount</TableHead>
                        <TableHead className={headTh}>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRentalLogs.map((log) => (
                        <TableRow
                          key={log.id}
                          data-testid={`row-rental-log-${log.id}`}
                          className="cursor-pointer hover-elevate border-border"
                          onClick={() => openLogDetails({ ...log, logType: "rental" })}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium font-mono text-sm">
                                  {format(new Date(log.loggedAt), "MMM d, yyyy")}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {format(new Date(log.loggedAt), "h:mm a")}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              {getActionBadge(log.action)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <span>{log.carName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{log.user.firstName} {log.user.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{log.customerName}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-mono text-muted-foreground">
                              {log.startDate} → {log.endDate}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-medium text-neon-cyan tabular-nums">
                              ₱{parseFloat(log.totalAmount || '0').toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            {log.action === 'updated' && log.fieldName && (
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="secondary" className="text-xs font-mono">{log.fieldName}</Badge>
                                <span className="text-muted-foreground truncate font-mono text-xs">{log.oldValue || "(empty)"}</span>
                                <ArrowRight className="h-3 w-3 flex-shrink-0 text-neon-cyan" />
                                <span className="font-medium truncate font-mono text-xs">{log.newValue || "(empty)"}</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <div className="glass-panel rounded-md">
              <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-neon-magenta" />
                  <h2 className={sectionTitle}>Expense Activity</h2>
                </div>
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  {filteredExpenseLogs.length} action{filteredExpenseLogs.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                {filteredExpenseLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-4">
                      <Receipt className="h-8 w-8 text-neon-magenta" />
                    </div>
                    <p className="font-mono text-sm uppercase tracking-widest">No expense logs</p>
                    <p className="text-sm text-muted-foreground mt-1">Added and edited expenses will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className={headTh}>Date & Time</TableHead>
                        <TableHead className={headTh}>Action</TableHead>
                        <TableHead className={headTh}>Car</TableHead>
                        <TableHead className={headTh}>User</TableHead>
                        <TableHead className={headTh}>Category</TableHead>
                        <TableHead className={headTh}>Amount</TableHead>
                        <TableHead className={headTh}>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenseLogs.map((log) => (
                        <TableRow
                          key={log.id}
                          data-testid={`row-expense-log-${log.id}`}
                          className="cursor-pointer hover-elevate border-border"
                          onClick={() => openLogDetails({ ...log, logType: "expense" })}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium font-mono text-sm">
                                  {format(new Date(log.loggedAt), "MMM d, yyyy")}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {format(new Date(log.loggedAt), "h:mm a")}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              {getActionBadge(log.action)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <span>{log.carName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{log.user.firstName} {log.user.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-widest">{log.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-medium text-neon-magenta tabular-nums">{formatCurrency(log.amount)}</span>
                          </TableCell>
                          <TableCell>
                            {log.action === 'updated' && log.fieldName ? (
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="secondary" className="text-xs font-mono">{log.fieldName}</Badge>
                                <span className="text-muted-foreground truncate font-mono text-xs">{log.oldValue || "(empty)"}</span>
                                <ArrowRight className="h-3 w-3 flex-shrink-0 text-neon-cyan" />
                                <span className="font-medium truncate font-mono text-xs">{log.newValue || "(empty)"}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground truncate">{log.description || "—"}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <LogDetailsDialog
        log={selectedLog}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
