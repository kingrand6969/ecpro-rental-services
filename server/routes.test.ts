import assert from "node:assert/strict";
import test from "node:test";
import type { InsertRental, Rental } from "@shared/schema";

// Importing route helpers must never connect to production Neon. The storage
// module receives an unreachable placeholder, and every test uses local stubs.
process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/unused";

const rentalInput = {
  carId: 7,
  userId: "manager-1",
  customerName: "Route Test",
  startDate: "2026-08-10",
  endDate: "2026-08-12",
  daysRented: 2,
  totalAmount: "200.00",
} as InsertRental;

test("active rental create delegates to the serialized availability method", async () => {
  const { createRentalThroughAvailability } = await import("./routes");
  const expected = { id: 41, ...rentalInput } as Rental;
  let unlockedCalls = 0;
  let serializedCalls = 0;
  const stub = {
    createRental: async () => {
      unlockedCalls += 1;
      return expected;
    },
    createRentalWithAvailability: async (input: InsertRental) => {
      serializedCalls += 1;
      assert.equal(input, rentalInput);
      return expected;
    },
    updateRentalWithAvailability: async () => expected,
  };

  const result = await createRentalThroughAvailability(stub, rentalInput);

  assert.equal(result, expected);
  assert.equal(serializedCalls, 1);
  assert.equal(unlockedCalls, 0);
});

test("active rental edit delegates to the serialized availability method", async () => {
  const { updateRentalThroughAvailability } = await import("./routes");
  const expected = { id: 41, ...rentalInput, endDate: "2026-08-14" } as Rental;
  const patch = { endDate: "2026-08-14", daysRented: 4 };
  let unlockedCalls = 0;
  let serializedCalls = 0;
  const stub = {
    updateRental: async () => {
      unlockedCalls += 1;
      return expected;
    },
    createRentalWithAvailability: async () => expected,
    updateRentalWithAvailability: async (id: number, input: Partial<InsertRental>) => {
      serializedCalls += 1;
      assert.equal(id, 41);
      assert.equal(input, patch);
      return expected;
    },
  };

  const result = await updateRentalThroughAvailability(stub, 41, patch);

  assert.equal(result, expected);
  assert.equal(serializedCalls, 1);
  assert.equal(unlockedCalls, 0);
});

test("storage domain errors map to stable route statuses", async () => {
  const { storageDomainErrorStatus } = await import("./routes");
  const { StorageDomainError } = await import("./storage");

  assert.equal(
    storageDomainErrorStatus(
      new StorageDomainError("not_found", "RENTAL_NOT_FOUND", "missing"),
    ),
    404,
  );
  assert.equal(
    storageDomainErrorStatus(
      new StorageDomainError("conflict", "CAR_DATE_CONFLICT", "booked"),
    ),
    409,
  );
  assert.equal(
    storageDomainErrorStatus(
      new StorageDomainError("validation", "INVALID_RENTAL_DATES", "invalid"),
    ),
    400,
  );
  assert.equal(
    storageDomainErrorStatus(
      new StorageDomainError("invariant", "CAR_SWITCH_DETAILS_MISSING", "broken"),
    ),
    500,
  );
});
