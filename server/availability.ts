import type { AvailabilityCar, Car, Rental } from "@shared/schema";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(date: string): boolean {
  if (!DATE_PATTERN.test(date)) return false;

  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function validateDateRange(startDate: string, endDate: string): void {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new Error("Dates must use a valid YYYY-MM-DD format");
  }
  if (endDate < startDate) {
    throw new Error("endDate must be on or after startDate");
  }
}

export function datesConflict(
  existingStart: string,
  existingEnd: string,
  requestedStart: string,
  requestedEnd: string,
): boolean {
  const existStart = new Date(existingStart);
  const existEnd = new Date(existingEnd);
  const newStart = new Date(requestedStart);
  const newEnd = new Date(requestedEnd);

  if (newStart < existEnd && newEnd > existStart) return true;

  const sameDay = newStart.getTime() === newEnd.getTime();
  const existingSameDay = existStart.getTime() === existEnd.getTime();

  if (sameDay && newStart >= existStart && newStart < existEnd) return true;
  if (existingSameDay && existStart >= newStart && existStart < newEnd) return true;
  return sameDay && existingSameDay && newStart.getTime() === existStart.getTime();
}

export function classifyCarAvailability(
  car: Car,
  rentals: Rental[],
  startDate: string,
  endDate: string,
  excludeRentalId?: number,
): AvailabilityCar {
  validateDateRange(startDate, endDate);

  if (car.status === "maintenance") {
    return { ...car, availability: "maintenance" };
  }

  const conflict = rentals.find(
    (rental) =>
      rental.carId === car.id &&
      rental.id !== excludeRentalId &&
      datesConflict(rental.startDate, rental.endDate, startDate, endDate),
  );

  if (!conflict) {
    return { ...car, availability: "available" };
  }

  return {
    ...car,
    availability: "booked",
    conflictingRental: {
      id: conflict.id,
      customerName: conflict.customerName,
      startDate: conflict.startDate,
      endDate: conflict.endDate,
    },
  };
}
