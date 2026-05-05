import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Rental } from "@shared/schema";

interface ConfirmPaymentDialogProps {
  rental: Rental | null;
  onClose: () => void;
}

export function ConfirmPaymentDialog({ rental, onClose }: ConfirmPaymentDialogProps) {
  const { toast } = useToast();
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentBank, setPaymentBank] = useState<string>("");
  const [errors, setErrors] = useState<{ paymentDate?: string; paymentBank?: string }>({});

  useEffect(() => {
    if (rental) {
      setPaymentDate(
        rental.paymentDate
          ? (rental.paymentDate as unknown as string)
          : format(new Date(), "yyyy-MM-dd"),
      );
      setPaymentBank(rental.paymentBank ?? "");
      setErrors({});
    }
  }, [rental]);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!rental) return;
      await apiRequest("PATCH", `/api/rentals/${rental.id}`, {
        paymentStatus: "confirmed",
        paymentDate,
        paymentBank: paymentBank.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rental-logs"] });
      toast({
        title: "Payment Confirmed",
        description: "The rental payment has been confirmed.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to confirm payment",
        variant: "destructive",
      });
    },
  });

  if (!rental) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!paymentDate) nextErrors.paymentDate = "Payment date is required";
    if (!paymentBank.trim()) nextErrors.paymentBank = "Bank is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      confirmMutation.mutate();
    }
  };

  return (
    <Dialog open={!!rental} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-base uppercase tracking-widest">
            Confirm Payment
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {rental.customerName} — ₱{parseFloat(rental.totalAmount).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="confirm-payment-date"
              className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground"
            >
              Payment Date
            </Label>
            <Input
              id="confirm-payment-date"
              type="date"
              value={paymentDate}
              max={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => setPaymentDate(e.target.value)}
              data-testid="input-confirm-payment-date"
            />
            {errors.paymentDate && (
              <p className="text-xs text-destructive font-mono">{errors.paymentDate}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirm-payment-bank"
              className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground"
            >
              Bank / E-Wallet Sent To
            </Label>
            <Input
              id="confirm-payment-bank"
              type="text"
              value={paymentBank}
              placeholder="e.g. BPI, BDO, GCash, Maya"
              onChange={(e) => setPaymentBank(e.target.value)}
              data-testid="input-confirm-payment-bank"
            />
            {errors.paymentBank && (
              <p className="text-xs text-destructive font-mono">{errors.paymentBank}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="font-mono text-xs uppercase tracking-wider"
              data-testid="button-confirm-payment-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={confirmMutation.isPending}
              className="font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
              data-testid="button-confirm-payment-submit"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {confirmMutation.isPending ? "Confirming..." : "Confirm Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
