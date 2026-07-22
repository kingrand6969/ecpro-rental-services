import { parseISO, startOfDay } from "date-fns";
import type { Rental } from "@shared/schema";

export type RentalStatus =
  | "reserved"
  | "out"
  | "returned"
  | "overdue"
  | "unpaid";

export interface StatusStyle {
  /** CSS colour for the bar fill or outline. */
  color: string;
  label: string;
  /** Single glyph so the state reads without relying on colour alone. */
  glyph: string;
  /** Outlined rather than filled — used for unpaid. */
  outlined?: boolean;
}

export const STATUS_STYLES: Record<RentalStatus, StatusStyle> = {
  reserved: { color: "hsl(var(--status-reserved))", label: "Reserved", glyph: "•" },
  out: { color: "hsl(var(--status-out))", label: "Out", glyph: "→" },
  returned: { color: "hsl(var(--status-returned))", label: "Returned", glyph: "✓" },
  overdue: { color: "hsl(var(--status-overdue))", label: "Overdue", glyph: "!" },
  unpaid: { color: "hsl(var(--status-unpaid))", label: "Unpaid", glyph: "₱", outlined: true },
};

/**
 * Where a rental stands right now.
 *
 * Unpaid outranks the schedule states: money owed is the thing staff chase,
 * and a booking that is both unpaid and merely upcoming still needs a call.
 * Overdue outranks it in turn — a car that has not come back is the most
 * urgent thing on the board.
 */
export function getRentalStatus(rental: Rental, now: Date = new Date()): RentalStatus {
  const today = startOfDay(now);
  const start = startOfDay(parseISO(rental.startDate as string));
  const end = startOfDay(parseISO(rental.endDate as string));

  if (end < today && !rental.isFinalized) return "overdue";
  if (rental.paymentStatus === "pending") return "unpaid";
  if (end < today) return "returned";
  if (start > today) return "reserved";
  return "out";
}

/** Relative luminance per WCAG, for picking readable text on a colour. */
function relativeLuminance(hex: string): number {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return 0;
  const [r, g, b] = m.slice(0, 3).map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Readable label colour for a bar filled with `background`.
 *
 * The timeline used to hardcode dark text, so an indigo or purple vehicle
 * colour left the label at roughly 3.4:1 — under the 4.5:1 needed at 12px.
 */
export function readableTextOn(background: string): string {
  if (!background.startsWith("#")) return "hsl(var(--background))";
  return relativeLuminance(background) > 0.35 ? "#0a0f1a" : "#f5f7fa";
}
