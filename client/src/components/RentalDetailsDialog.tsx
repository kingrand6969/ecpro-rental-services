import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Calendar, User, Phone, Mail, DollarSign, FileText, Image } from "lucide-react";
import type { Car, Rental } from "@shared/schema";

interface RentalDetailsDialogProps {
  rental: Rental | null;
  car?: Car;
  onClose: () => void;
}

export function RentalDetailsDialog({ rental, car, onClose }: RentalDetailsDialogProps) {
  if (!rental) return null;

  return (
    <Dialog open={!!rental} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {car && (
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: car.colorCode }}
              />
            )}
            <DialogTitle>Rental Details</DialogTitle>
          </div>
          <DialogDescription>
            {car?.name ?? "Unknown Car"} - {car?.plateNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant={rental.isFinalized ? "secondary" : "outline"}>
              {rental.isFinalized ? "Finalized" : "Active"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              ID: #{rental.id}
            </span>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Information
            </h4>

            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{rental.customerName}</span>
              </div>
              {rental.customerEmail && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </span>
                  <span>{rental.customerEmail}</span>
                </div>
              )}
              {rental.customerPhone && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </span>
                  <span>{rental.customerPhone}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Rental Period
            </h4>

            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Start Date</span>
                <span className="font-medium">
                  {format(parseISO(rental.startDate as string), "MMMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">End Date</span>
                <span className="font-medium">
                  {format(parseISO(rental.endDate as string), "MMMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{rental.daysRented} days</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment
            </h4>

            <div className="p-4 rounded-md bg-muted">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Amount Paid</span>
                <span className="text-xl font-semibold">
                  ₱{parseFloat(rental.totalAmount).toLocaleString()}
                </span>
              </div>
            </div>

            {rental.paymentScreenshotUrl && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Image className="h-3 w-3" />
                  Payment Screenshot
                </span>
                <a
                  href={rental.paymentScreenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={rental.paymentScreenshotUrl}
                    alt="Payment screenshot"
                    className="max-h-48 rounded-md border object-cover hover:opacity-90 transition-opacity"
                  />
                </a>
              </div>
            )}
          </div>

          {rental.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </h4>
                <p className="text-sm text-muted-foreground">{rental.notes}</p>
              </div>
            </>
          )}

          <div className="pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
