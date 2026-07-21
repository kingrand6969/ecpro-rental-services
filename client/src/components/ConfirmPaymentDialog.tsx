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
import { CheckCircle, Upload } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Rental } from "@shared/schema";

export type ConfirmPaymentKind = "reservation" | "full";

interface ConfirmPaymentDialogProps {
  rental: Rental | null;
  /** Which payment stage to confirm. Defaults to "full" for backwards compat. */
  kind?: ConfirmPaymentKind;
  onClose: () => void;
}

export function ConfirmPaymentDialog({
  rental,
  kind = "full",
  onClose,
}: ConfirmPaymentDialogProps) {
  const { toast } = useToast();
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentBank, setPaymentBank] = useState<string>("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ paymentDate?: string; paymentBank?: string }>({});

  useEffect(() => {
    if (rental) {
      const existingDate =
        kind === "reservation" ? rental.reservationDate : rental.paymentDate;
      const existingBank =
        kind === "reservation" ? rental.reservationBank : rental.paymentBank;
      const existingShot =
        kind === "reservation"
          ? rental.reservationScreenshotUrl
          : rental.paymentScreenshotUrl;
      setPaymentDate(
        existingDate
          ? (existingDate as unknown as string)
          : format(new Date(), "yyyy-MM-dd"),
      );
      setPaymentBank(existingBank ?? "");
      setScreenshotUrl(existingShot ?? null);
      setErrors({});
    }
  }, [rental, kind]);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!rental) return;
      const payload: Record<string, unknown> =
        kind === "reservation"
          ? {
              reservationStatus: "confirmed",
              reservationDate: paymentDate,
              reservationBank: paymentBank.trim(),
            }
          : {
              paymentStatus: "confirmed",
              paymentDate,
              paymentBank: paymentBank.trim(),
            };
      if (screenshotUrl) {
        payload[
          kind === "reservation" ? "reservationScreenshotUrl" : "paymentScreenshotUrl"
        ] = screenshotUrl;
      }
      await apiRequest("PATCH", `/api/rentals/${rental.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/income-trend"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rental-logs"] });
      toast({
        title:
          kind === "reservation"
            ? "Reservation Confirmed"
            : "Payment Confirmed",
        description:
          kind === "reservation"
            ? "The reservation payment has been confirmed."
            : "The total/final payment has been confirmed.",
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

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL ?? data.url,
      objectPath: data.objectPath,
    };
  };

  const handleUploadComplete = async (result: {
    successful: Array<{ uploadURL?: string; objectPath?: string }>;
  }) => {
    const uploaded = result.successful?.[0];
    if (uploaded?.objectPath) {
      setScreenshotUrl(uploaded.objectPath);
      return;
    }
    const uploadedUrl = uploaded?.uploadURL;
    if (!uploadedUrl) return;
    try {
      const response = await apiRequest("PUT", "/api/payment-screenshots", {
        screenshotURL: uploadedUrl,
      });
      const data = await response.json();
      setScreenshotUrl(data.objectPath);
    } catch {
      // fall back to the raw upload URL if normalization endpoint fails
      setScreenshotUrl(uploadedUrl);
    }
  };

  if (!rental) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!paymentDate) nextErrors.paymentDate = "Date is required";
    if (!paymentBank.trim()) nextErrors.paymentBank = "Bank is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      confirmMutation.mutate();
    }
  };

  const headerTitle =
    kind === "reservation" ? "Confirm Reservation" : "Confirm Total Payment";
  const headerAmount =
    kind === "reservation"
      ? rental.reservationFee
        ? `Reservation: ₱${parseFloat(rental.reservationFee).toLocaleString()}`
        : "Reservation amount not set"
      : `Total: ₱${parseFloat(rental.totalAmount).toLocaleString()}`;
  const submitLabel =
    kind === "reservation" ? "Confirm Reservation" : "Confirm Payment";
  const dateLabel =
    kind === "reservation" ? "Reservation Date" : "Payment Date";
  const bankLabel =
    kind === "reservation"
      ? "Bank / E-Wallet (Reservation Sent To)"
      : "Bank / E-Wallet (Payment Sent To)";

  return (
    <Dialog open={!!rental} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-base uppercase tracking-widest">
            {headerTitle}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {rental.customerName} — {headerAmount}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="confirm-payment-date"
              className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground"
            >
              {dateLabel}
            </Label>
            <Input
              id="confirm-payment-date"
              type="date"
              value={paymentDate}
              max={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => setPaymentDate(e.target.value)}
              data-testid={`input-confirm-${kind}-date`}
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
              {bankLabel}
            </Label>
            <Input
              id="confirm-payment-bank"
              type="text"
              value={paymentBank}
              placeholder="e.g. BPI, BDO, GCash, Maya"
              onChange={(e) => setPaymentBank(e.target.value)}
              data-testid={`input-confirm-${kind}-bank`}
            />
            {errors.paymentBank && (
              <p className="text-xs text-destructive font-mono">{errors.paymentBank}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Screenshot (Optional)
            </Label>
            {screenshotUrl ? (
              <div className="space-y-2">
                <img
                  src={screenshotUrl}
                  alt="Payment screenshot"
                  className="max-h-32 rounded-md border border-border object-cover"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setScreenshotUrl(null)}
                  className="font-mono text-[11px] uppercase tracking-wider"
                  data-testid={`button-confirm-${kind}-remove-screenshot`}
                >
                  Remove screenshot
                </Button>
              </div>
            ) : (
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleUploadComplete}
                buttonClassName="w-full"
              >
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  <span>Upload Screenshot</span>
                </div>
              </ObjectUploader>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="font-mono text-xs uppercase tracking-wider"
              data-testid={`button-confirm-${kind}-cancel`}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={confirmMutation.isPending}
              className="font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
              data-testid={`button-confirm-${kind}-submit`}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {confirmMutation.isPending ? "Confirming..." : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
