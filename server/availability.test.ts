import assert from "node:assert/strict";
import test from "node:test";
import type { Car, Rental } from "@shared/schema";
import {
  classifyCarAvailability,
  validateDateRange,
} from "./availability";

const car = {
  id: 1,
  name: "Test Car",
  model: "Model",
  plateNumber: "TEST-1",
  color: "Blue",
  colorCode: "#0000ff",
  monthlyPayment: "1000",
  downPayment: "0",
  lastOilChangeMileage: 0,
  currentMileage: 0,
  oilChangeIntervalKm: 5000,
  oilChangeIntervalDays: 180,
  lastMaintenanceDate: null,
  status: "available",
  maintenanceReason: null,
  maintenanceUpdatedAt: null,
  maintenanceUpdatedBy: null,
  brand: null,
  dateAcquired: null,
  registrationConfirmedAt: null,
  imageUrl: null,
  displayOrder: null,
  createdAt: null,
  updatedAt: null,
} satisfies Car;

function rental(
  id: number,
  startDate: string,
  endDate: string,
  carId = car.id,
): Rental {
  return {
    id,
    carId,
    userId: "user-1",
    customerId: null,
    customerName: `Customer ${id}`,
    customerEmail: null,
    customerPhone: null,
    startDate,
    endDate,
    daysRented: 1,
    totalAmount: "100",
    paymentScreenshotUrl: null,
    paymentStatus: "pending",
    paymentDate: null,
    paymentBank: null,
    reservationFee: null,
    reservationStatus: "none",
    reservationDate: null,
    reservationBank: null,
    reservationScreenshotUrl: null,
    isFinalized: false,
    lastFinalizeReminder: null,
    notes: null,
    createdAt: null,
    updatedAt: null,
  };
}

test("maintenance car is classified as maintenance", () => {
  const result = classifyCarAvailability(
    { ...car, status: "maintenance" },
    [rental(1, "2026-08-02", "2026-08-04")],
    "2026-08-02",
    "2026-08-03",
  );

  assert.equal(result.availability, "maintenance");
  assert.equal(result.conflictingRental, undefined);
});

test("overlap is classified as booked with a conflict snapshot", () => {
  const conflict = rental(7, "2026-08-02", "2026-08-04");
  const result = classifyCarAvailability(
    car,
    [conflict],
    "2026-08-03",
    "2026-08-05",
  );

  assert.equal(result.availability, "booked");
  assert.deepEqual(result.conflictingRental, {
    id: 7,
    customerName: "Customer 7",
    startDate: "2026-08-02",
    endDate: "2026-08-04",
  });
});

test("requested start equal to existing end is available for same-day handover", () => {
  const result = classifyCarAvailability(
    car,
    [rental(1, "2026-08-01", "2026-08-03")],
    "2026-08-03",
    "2026-08-05",
  );

  assert.equal(result.availability, "available");
});

test("two same-day rentals on the same date conflict", () => {
  const result = classifyCarAvailability(
    car,
    [rental(1, "2026-08-03", "2026-08-03")],
    "2026-08-03",
    "2026-08-03",
  );

  assert.equal(result.availability, "booked");
});

test("end before start throws", () => {
  assert.throws(
    () => validateDateRange("2026-08-04", "2026-08-03"),
    /endDate/i,
  );
});

test("invalid date format throws", () => {
  assert.throws(
    () => validateDateRange("08/03/2026", "2026-08-04"),
    /YYYY-MM-DD/,
  );
});

test("excludeRentalId ignores that rental", () => {
  const result = classifyCarAvailability(
    car,
    [rental(9, "2026-08-02", "2026-08-04")],
    "2026-08-02",
    "2026-08-04",
    9,
  );

  assert.equal(result.availability, "available");
  assert.equal(result.conflictingRental, undefined);
});
