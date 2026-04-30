import { differenceInDays, parseISO } from "date-fns";
import type { Car } from "@shared/schema";

export const DEFAULT_OIL_INTERVAL_DAYS = 180;

export type OilChangeStatus = {
  due: boolean;
  reasonKm: boolean;
  reasonTime: boolean;
  kmSince: number;
  kmInterval: number;
  kmOverBy: number;
  daysSince: number | null;
  daysInterval: number;
  daysOverBy: number | null;
};

export function getOilChangeStatus(car: Car, today: Date = new Date()): OilChangeStatus {
  const cur = car.currentMileage ?? 0;
  const lastKm = car.lastOilChangeMileage ?? 0;
  const kmInterval = car.oilChangeIntervalKm ?? 0;
  const kmSince = Math.max(0, cur - lastKm);
  const reasonKm = kmInterval > 0 && kmSince >= kmInterval;
  const kmOverBy = reasonKm ? kmSince - kmInterval : 0;

  const daysInterval = car.oilChangeIntervalDays ?? DEFAULT_OIL_INTERVAL_DAYS;
  let daysSince: number | null = null;
  let reasonTime = false;
  let daysOverBy: number | null = null;

  if (car.lastMaintenanceDate) {
    const lastDate = parseISO(car.lastMaintenanceDate);
    daysSince = Math.max(0, differenceInDays(today, lastDate));
    if (daysInterval > 0 && daysSince >= daysInterval) {
      reasonTime = true;
      daysOverBy = daysSince - daysInterval;
    }
  }

  return {
    due: reasonKm || reasonTime,
    reasonKm,
    reasonTime,
    kmSince,
    kmInterval,
    kmOverBy,
    daysSince,
    daysInterval,
    daysOverBy,
  };
}

export function formatDaysAge(days: number): string {
  if (days >= 60) {
    const months = Math.round(days / 30);
    return `${months} mo`;
  }
  return `${days}d`;
}
