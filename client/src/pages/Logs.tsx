import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Car, User, Calendar, ArrowRight } from "lucide-react";
import type { EditLogWithDetails, Car as CarType } from "@shared/schema";

export default function Logs() {
  const [selectedCarId, setSelectedCarId] = useState<string>("all");

  const { data: cars, isLoading: carsLoading } = useQuery<CarType[]>({
    queryKey: ["/api/cars"],
  });

  const { data: logs, isLoading: logsLoading } = useQuery<EditLogWithDetails[]>({
    queryKey: ["/api/edit-logs"],
  });

  const filteredLogs = logs?.filter(log => 
    selectedCarId === "all" || log.carId === parseInt(selectedCarId)
  ) || [];

  const isLoading = carsLoading || logsLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <History className="h-8 w-8" />
              Edit Logs
            </h1>
            <p className="text-muted-foreground mt-1">
              Track all car information changes with timestamps
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Change History
            </CardTitle>
            <CardDescription>
              {filteredLogs.length} edit{filteredLogs.length !== 1 ? 's' : ''} recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No edit logs found</p>
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
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
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
      </div>
    </ScrollArea>
  );
}
