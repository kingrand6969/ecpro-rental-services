import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO, differenceInDays } from "date-fns";
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
import { Plus, Search, Eye, Edit, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { CreateRentalDialog } from "@/components/CreateRentalDialog";
import { RentalDetailsDialog } from "@/components/RentalDetailsDialog";
import { EditRentalDialog } from "@/components/EditRentalDialog";
import { ConfirmPaymentDialog, type ConfirmPaymentKind } from "@/components/ConfirmPaymentDialog";
import { getRegistrationStatus } from "@/components/CarDetailsDialog";
import type { Car, Rental } from "@shared/schema";

export default function Rentals() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewRental, setViewRental] = useState<Rental | null>(null);
  const [editRental, setEditRental] = useState<Rental | null>(null);
  const [confirmPaymentRental, setConfirmPaymentRental] = useState<{
    rental: Rental;
    kind: ConfirmPaymentKind;
  } | null>(null);

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
      (statusFilter === "reservation" && rental.reservationStatus === "pending") ||
      (statusFilter === "confirmed" && rental.paymentStatus === "confirmed");

    return matchesSearch && matchesStatus;
  });

  const isLoading = rentalsLoading || carsLoading;

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 h-14 border-b border-border flex-wrap shrink-0 bg-background/60 backdrop-blur">
        <h1
          className="font-mono text-base md:text-lg font-bold uppercase tracking-widest text-foreground"
          data-testid="text-rentals-title"
        >
          Rentals
        </h1>
        <Button
          onClick={() => setCreateOpen(true)}
          size="sm"
          data-testid="button-book-rent"
          className="font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
        >
          <Plus className="h-4 w-4 mr-1" />
          Book a Rent
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 neon-scrollbar">
        <div className="glass-panel rounded-md">
          <div className="p-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">All Rentals</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search rentals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64 font-mono text-sm"
                  data-testid="input-search-rentals"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 font-mono text-xs uppercase tracking-wider" data-testid="select-status-filter">
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
          <div className="p-2">
            {isLoading ? (
              <div className="space-y-3 p-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredRentals && filteredRentals.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Car</TableHead>
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Customer</TableHead>
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Period</TableHead>
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground text-right">Days</TableHead>
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground text-right">Amount</TableHead>
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Status</TableHead>
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Payment</TableHead>
                      <TableHead className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRentals.map((rental) => {
                      const car = getCarById(rental.carId);
                      return (
                        <TableRow key={rental.id} data-testid={`rental-row-${rental.id}`} className="border-border">
                          <TableCell>
                            <div>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
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
                                <div className="text-xs text-muted-foreground">
                                  {rental.customerEmail}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-mono tabular-nums text-muted-foreground">
                              {format(parseISO(rental.startDate as string), "MMM d")} →{" "}
                              {format(parseISO(rental.endDate as string), "MMM d, yyyy")}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {differenceInDays(parseISO(rental.endDate as string), parseISO(rental.startDate as string))}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-neon-cyan font-medium">
                            ₱{parseFloat(rental.totalAmount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {rental.isFinalized ? (
                                <Badge className="bg-muted text-muted-foreground border border-border">Finalized</Badge>
                              ) : (
                                <Badge className="bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30">Active</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2 items-start">
                              {/* Reservation row */}
                              <div className="flex flex-col gap-1 items-start">
                                {rental.reservationStatus === "confirmed" ? (
                                  <Badge className="gap-1 bg-neon-magenta/15 text-neon-magenta border border-neon-magenta/30">
                                    <CheckCircle className="h-3 w-3" />
                                    Reservation Paid
                                    {rental.reservationFee && (
                                      <span className="ml-1 tabular-nums">
                                        ₱{parseFloat(rental.reservationFee).toLocaleString()}
                                      </span>
                                    )}
                                  </Badge>
                                ) : rental.reservationStatus === "pending" ? (
                                  <>
                                    <Badge className="bg-chart-4/15 text-chart-4 border border-chart-4/30">
                                      Reservation Pending
                                      {rental.reservationFee && (
                                        <span className="ml-1 tabular-nums">
                                          ₱{parseFloat(rental.reservationFee).toLocaleString()}
                                        </span>
                                      )}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs h-auto py-1 px-2 font-mono uppercase tracking-wider"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmPaymentRental({ rental, kind: "reservation" });
                                      }}
                                      data-testid={`button-confirm-reservation-${rental.id}`}
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Confirm Reservation
                                    </Button>
                                  </>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground border-border">
                                    No Reservation
                                  </Badge>
                                )}
                              </div>
                              {/* Total payment row */}
                              <div className="flex flex-col gap-1 items-start">
                                {rental.paymentStatus === "confirmed" ? (
                                  <Badge className="gap-1 bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30">
                                    <CheckCircle className="h-3 w-3" />
                                    Total Paid
                                  </Badge>
                                ) : (
                                  <>
                                    <Badge className="bg-neon-magenta/15 text-neon-magenta border border-neon-magenta/30">
                                      Total Pending
                                    </Badge>
                                    {isSuperAdmin && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs h-auto py-1 px-2 font-mono uppercase tracking-wider"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmPaymentRental({ rental, kind: "full" });
                                        }}
                                        data-testid={`button-confirm-payment-${rental.id}`}
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Confirm Total
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
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
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {searchTerm || statusFilter !== "all"
                    ? "No rentals match your filters"
                    : "No rentals yet"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

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

      <ConfirmPaymentDialog
        rental={confirmPaymentRental?.rental ?? null}
        kind={confirmPaymentRental?.kind ?? "full"}
        onClose={() => setConfirmPaymentRental(null)}
      />
    </div>
  );
}
