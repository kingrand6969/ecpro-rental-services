import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Car, User, Calendar, ArrowRight, ClipboardList, Plus, Pencil, Trash2 } from "lucide-react";
import type { EditLogWithDetails, Car as CarType, RentalLogWithUser } from "@shared/schema";
import { LogDetailsDialog } from "@/components/LogDetailsDialog";

type SelectedLog =
  | ({ logType: "car" } & EditLogWithDetails)
  | ({ logType: "rental" } & RentalLogWithUser)
  | null;

export default function Logs() {
  const [selectedCarId, setSelectedCarId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");
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

  const filteredEditLogs = editLogs?.filter(log => 
    selectedCarId === "all" || log.carId === parseInt(selectedCarId)
  ) || [];

  const filteredRentalLogs = rentalLogs?.filter(log =>
    selectedCarId === "all" || log.carId === parseInt(selectedCarId)
  ) || [];

  const isLoading = carsLoading || editLogsLoading || rentalLogsLoading;

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created": return <Plus className="h-4 w-4 text-green-500" />;
      case "updated": return <Pencil className="h-4 w-4 text-blue-500" />;
      case "deleted": return <Trash2 className="h-4 w-4 text-red-500" />;
      default: return <History className="h-4 w-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "created": return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">Created</Badge>;
      case "updated": return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400">Updated</Badge>;
      case "deleted": return <Badge className="bg-red-500/20 text-red-600 dark:text-red-400">Deleted</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const totalLogs = (filteredEditLogs?.length || 0) + (filteredRentalLogs?.length || 0);

  return (
    <ScrollArea className="h-full">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <History className="h-8 w-8" />
              Activity Logs
            </h1>
            <p className="text-muted-foreground mt-1">
              Track all changes to cars and rentals with timestamps
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter by Car:</span>
            <Select value={selectedCarId} onValueChange={setSelectedCarId}>
              <SelectTrigger className="w-48" data-testid="select-car-filter">
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all-logs">
              All Logs ({totalLogs})
            </TabsTrigger>
            <TabsTrigger value="cars" data-testid="tab-car-logs">
              <Car className="h-4 w-4 mr-1" />
              Car Edits ({filteredEditLogs.length})
            </TabsTrigger>
            <TabsTrigger value="rentals" data-testid="tab-rental-logs">
              <ClipboardList className="h-4 w-4 mr-1" />
              Rentals ({filteredRentalLogs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  All Activity
                </CardTitle>
                <CardDescription>
                  {totalLogs} log{totalLogs !== 1 ? 's' : ''} recorded
                </CardDescription>
              </CardHeader>
              <CardContent>
                {totalLogs === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No logs found</p>
                    <p className="text-sm">Activity will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Car</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...filteredEditLogs.map(log => ({ ...log, logType: 'car' as const, timestamp: new Date(log.editedAt) })),
                        ...filteredRentalLogs.map(log => ({ ...log, logType: 'rental' as const, timestamp: new Date(log.loggedAt) }))
                      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                       .map((log, idx) => (
                        <TableRow
                          key={`${log.logType}-${log.id}`}
                          data-testid={`row-log-${log.logType}-${log.id}`}
                          className="cursor-pointer hover-elevate"
                          onClick={() => openLogDetails(log as NonNullable<SelectedLog>)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {format(log.timestamp, "MMM d, yyyy")}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {format(log.timestamp, "h:mm a")}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.logType === 'car' ? (
                              <Badge variant="outline"><Car className="h-3 w-3 mr-1" />Car</Badge>
                            ) : (
                              <Badge variant="outline"><ClipboardList className="h-3 w-3 mr-1" />Rental</Badge>
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
                              <span>{log.user.firstName} {log.user.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.logType === 'car' ? (
                              <Badge variant="outline">{log.fieldName}</Badge>
                            ) : (
                              getActionBadge(log.action)
                            )}
                          </TableCell>
                          <TableCell>
                            {log.logType === 'car' ? (
                              <div className="flex items-center gap-2 max-w-xs">
                                <span className="text-muted-foreground truncate" title={log.oldValue || "(empty)"}>
                                  {log.oldValue || "(empty)"}
                                </span>
                                <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                <span className="font-medium truncate" title={log.newValue || "(empty)"}>
                                  {log.newValue || "(empty)"}
                                </span>
                              </div>
                            ) : (
                              <div className="text-sm">
                                {log.action === 'updated' && log.fieldName ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">{log.fieldName}</Badge>
                                    <span className="text-muted-foreground truncate">{log.oldValue || "(empty)"}</span>
                                    <ArrowRight className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-medium truncate">{log.newValue || "(empty)"}</span>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="font-medium">{log.customerName}</span>
                                    <span className="text-muted-foreground ml-2">
                                      {log.startDate} - {log.endDate}
                                    </span>
                                    <span className="ml-2">₱{parseFloat(log.totalAmount || '0').toLocaleString()}</span>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cars" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Car Edit History
                </CardTitle>
                <CardDescription>
                  {filteredEditLogs.length} edit{filteredEditLogs.length !== 1 ? 's' : ''} recorded
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredEditLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No car edit logs found</p>
                    <p className="text-sm">Changes to car information will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Car</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEditLogs.map((log) => (
                        <TableRow
                          key={log.id}
                          data-testid={`row-car-log-${log.id}`}
                          className="cursor-pointer hover-elevate"
                          onClick={() => openLogDetails({ ...log, logType: "car" })}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {format(new Date(log.editedAt), "MMM d, yyyy")}
                                </div>
                                <div className="text-sm text-muted-foreground">
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
                                <div className="text-sm text-muted-foreground">{log.car.plateNumber}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{log.user.firstName} {log.user.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.fieldName}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 max-w-xs">
                              <span className="text-muted-foreground truncate" title={log.oldValue || "(empty)"}>
                                {log.oldValue || "(empty)"}
                              </span>
                              <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                              <span className="font-medium truncate" title={log.newValue || "(empty)"}>
                                {log.newValue || "(empty)"}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rentals" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Rental Activity
                </CardTitle>
                <CardDescription>
                  {filteredRentalLogs.length} rental action{filteredRentalLogs.length !== 1 ? 's' : ''} recorded
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredRentalLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No rental logs found</p>
                    <p className="text-sm">Rental create, update, and delete actions will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Car</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Rental Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRentalLogs.map((log) => (
                        <TableRow
                          key={log.id}
                          data-testid={`row-rental-log-${log.id}`}
                          className="cursor-pointer hover-elevate"
                          onClick={() => openLogDetails({ ...log, logType: "rental" })}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {format(new Date(log.loggedAt), "MMM d, yyyy")}
                                </div>
                                <div className="text-sm text-muted-foreground">
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
                              <span>{log.user.firstName} {log.user.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{log.customerName}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {log.startDate} - {log.endDate}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              ₱{parseFloat(log.totalAmount || '0').toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            {log.action === 'updated' && log.fieldName && (
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="secondary" className="text-xs">{log.fieldName}</Badge>
                                <span className="text-muted-foreground truncate">{log.oldValue || "(empty)"}</span>
                                <ArrowRight className="h-3 w-3 flex-shrink-0" />
                                <span className="font-medium truncate">{log.newValue || "(empty)"}</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <LogDetailsDialog
        log={selectedLog}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </ScrollArea>
  );
}
