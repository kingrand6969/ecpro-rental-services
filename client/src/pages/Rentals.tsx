import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Eye, Edit, Image, AlertTriangle, CheckCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { CreateRentalDialog } from "@/components/CreateRentalDialog";
import { RentalDetailsDialog } from "@/components/RentalDetailsDialog";
import { EditRentalDialog } from "@/components/EditRentalDialog";
import { needsRegistrationUpdate, getRegistrationStatus } from "@/components/CarDetailsDialog";
import type { Car, Rental } from "@shared/schema";

export default function Rentals() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewRental, setViewRental] = useState<Rental | null>(null);
  const [editRental, setEditRental] = useState<Rental | null>(null);

  const { data: rentals, isLoading: rentalsLoading } = useQuery<Rental[]>({
    queryKey: ["/api/rentals"],
  });

  const { data: cars, isLoading: carsLoading } = useQuery<Car[]>({
    queryKey: ["/api/cars"],
  });

  const getCarById = (carId: number) => {
    return cars?.find((car) => car.id === carId);
  };

  const filteredRentals = rentals?.filter((rental) => {
    const matchesSearch =
      rental.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCarById(rental.carId)?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "finalized" && rental.isFinalized) ||
      (statusFilter === "active" && !rental.isFinalized) ||
      (statusFilter === "reservation" && rental.paymentStatus === "pending") ||
      (statusFilter === "confirmed" && rental.paymentStatus === "confirmed");

    return matchesSearch && matchesStatus;
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (rentalId: number) => {
      await apiRequest("PATCH", `/api/rentals/${rentalId}`, {
        paymentStatus: "confirmed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
      toast({
        title: "Payment Confirmed",
        description: "The rental payment has been confirmed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to confirm payment",
        variant: "destructive",
      });
    },
  });

  const isLoading = rentalsLoading || carsLoading;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <h1 className="text-2xl font-semibold">Rentals</h1>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-book-rent">
          <Plus className="h-4 w-4 mr-2" />
          Book a Rent
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg">All Rentals</CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search rentals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                  data-testid="input-search-rentals"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="reservation">Reservations</SelectItem>
                  <SelectItem value="confirmed">Paid</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredRentals && filteredRentals.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Car</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRentals.map((rental) => {
                    const car = getCarById(rental.carId);
                    return (
                      <TableRow key={rental.id} data-testid={`rental-row-${rental.id}`}>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: car?.colorCode ?? "#6366f1" }}
                              />
                              <span className="font-medium">{car?.name ?? "Unknown"}</span>
                            </div>
                            {car && getRegistrationStatus(car).status === "overdue" && (
                              <div className="flex items-center gap-1 mt-1 ml-5 text-red-600 dark:text-red-400">
                                <AlertTriangle className="h-3 w-3" />
                                <span className="text-xs font-bold">OR CR Needs Update</span>
                              </div>
                            )}
                            {car && getRegistrationStatus(car).status === "warning" && (
                              <div className="flex items-center gap-1 mt-1 ml-5 text-orange-600 dark:text-orange-400">
                                <AlertTriangle className="h-3 w-3" />
                                <span className="text-xs font-bold">OR CR Due in {getRegistrationStatus(car).daysUntilDue} day(s)</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{rental.customerName}</div>
                            {rental.customerEmail && (
                              <div className="text-sm text-muted-foreground">
                                {rental.customerEmail}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(parseISO(rental.startDate as string), "MMM d")} -{" "}
                            {format(parseISO(rental.endDate as string), "MMM d, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {differenceInDays(parseISO(rental.endDate as string), parseISO(rental.startDate as string))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          ₱{parseFloat(rental.totalAmount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={rental.isFinalized ? "secondary" : "outline"}
                            >
                              {rental.isFinalized ? "Finalized" : "Active"}
                            </Badge>
                            {rental.paymentStatus === "pending" && (
                              <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-600">
                                Reservation
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {rental.paymentStatus === "confirmed" ? (
                            <Badge variant="outline" className="gap-1 text-green-600 dark:text-green-400 border-green-300 dark:border-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Paid
                            </Badge>
                          ) : (
                            <div className="flex flex-col gap-1 items-start">
                              <Badge variant="outline" className="gap-1 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-600">
                                Pending
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-auto py-1 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmPaymentMutation.mutate(rental.id);
                                }}
                                disabled={confirmPaymentMutation.isPending}
                                data-testid={`button-confirm-payment-${rental.id}`}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Confirm
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewRental(rental)}
                              data-testid={`button-view-${rental.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditRental(rental)}
                                data-testid={`button-edit-${rental.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "No rentals match your filters"
                  : "No rentals yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateRentalDialog open={createOpen} onOpenChange={setCreateOpen} />

      <RentalDetailsDialog
        rental={viewRental}
        car={viewRental ? getCarById(viewRental.carId) : undefined}
        onClose={() => setViewRental(null)}
      />

      {isAdmin && (
        <EditRentalDialog
          rental={editRental}
          onClose={() => setEditRental(null)}
        />
      )}
    </div>
  );
}
