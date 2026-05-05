import { useState } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
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
import { Calendar, User, Phone, Mail, DollarSign, FileText, Image, CheckCircle, Landmark } from "lucide-react";
import { ConfirmPaymentDialog } from "@/components/ConfirmPaymentDialog";
import type { Car, Rental } from "@shared/schema";

interface RentalDetailsDialogProps {
  rental: Rental | null;
  car?: Car;
  onClose: () => void;
}

export function RentalDetailsDialog({ rental, car, onClose }: RentalDetailsDialogProps) {
  const [confirmPaymentOpen, setConfirmPaymentOpen] = useState(false);
  if (!rental) return null;

  return (
    <Dialog open={!!rental} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {car && (
              <div
                className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]"
                style={{ backgroundColor: car.colorCode, color: car.colorCode }}
              />
            )}
            <DialogTitle className="font-mono text-base uppercase tracking-widest">Rental Details</DialogTitle>
          </div>
          <DialogDescription className="font-mono text-xs">
            {car?.name ?? "Unknown Car"} • {car?.plateNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`font-mono text-[10px] uppercase tracking-widest ${
                  rental.isFinalized
                    ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                    : "border-neon-magenta/40 bg-neon-magenta/10 text-neon-magenta"
                }`}
              >
                {rental.isFinalized ? "Finalized" : "Active"}
              </Badge>
              {rental.paymentStatus === "pending" ? (
                <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest border-chart-4/40 bg-chart-4/10 text-chart-4">
                  Reservation • Pending
                </Badge>
              ) : (
                <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan">
                  Paid
                </Badge>
              )}
            </div>
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground tabular-nums">
              ID #{rental.id}
            </span>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-neon-cyan" />
              Customer Information
            </h4>

            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Name</span>
                <span className="font-medium">{rental.customerName}</span>
              </div>
              {rental.customerEmail && (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </span>
                  <span>{rental.customerEmail}</span>
                </div>
              )}
              {rental.customerPhone && (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
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
            <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-neon-magenta" />
              Rental Period
            </h4>

            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Start Date</span>
                <span className="font-medium tabular-nums">
                  {format(parseISO(rental.startDate as string), "MMMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">End Date</span>
                <span className="font-medium tabular-nums">
                  {format(parseISO(rental.endDate as string), "MMMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Duration</span>
                <span className="font-medium tabular-nums">{differenceInDays(parseISO(rental.endDate as string), parseISO(rental.startDate as string))} days</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-neon-cyan" />
              Payment
            </h4>

            <div className="rounded-md border border-neon-cyan/30 bg-neon-cyan/5 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Total Amount</span>
                <span className="text-xl font-bold tabular-nums text-neon-cyan">
                  ₱{parseFloat(rental.totalAmount).toLocaleString()}
                </span>
              </div>
              {rental.paymentStatus === "pending" && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-mono uppercase tracking-wider">
                  Payment not yet confirmed
                </p>
              )}
            </div>

            {rental.paymentStatus === "confirmed" && (rental.paymentDate || rental.paymentBank) && (
              <div className="grid gap-2 text-sm">
                {rental.paymentDate && (
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Payment Date
                    </span>
                    <span className="font-medium tabular-nums" data-testid="text-payment-date">
                      {format(parseISO(rental.paymentDate as unknown as string), "MMMM d, yyyy")}
                    </span>
                  </div>
                )}
                {rental.paymentBank && (
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                      <Landmark className="h-3 w-3" />
                      Sent To
                    </span>
                    <span className="font-medium" data-testid="text-payment-bank">
                      {rental.paymentBank}
                    </span>
                  </div>
                )}
              </div>
            )}

            {rental.paymentStatus === "pending" && (
              <Button
                type="button"
                onClick={() => setConfirmPaymentOpen(true)}
                className="w-full font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
                data-testid="button-open-confirm-payment"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirm Payment
              </Button>
            )}

            {rental.paymentScreenshotUrl && (
              <div className="space-y-2">
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
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
                    className="max-h-48 rounded-md border border-border object-cover hover:opacity-90 transition-opacity"
                  />
                </a>
              </div>
            )}
          </div>

          {rental.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-neon-cyan" />
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
              className="w-full font-mono text-xs uppercase tracking-wider"
            >
              Close
            </Button>
          </div>
        </div>

        <ConfirmPaymentDialog
          rental={confirmPaymentOpen ? rental : null}
          onClose={() => setConfirmPaymentOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
