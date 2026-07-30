import assert from "node:assert/strict";
import test from "node:test";

// This suite exercises pure storage contracts only. It deliberately points the
// module at an unreachable placeholder and never executes a database query.
process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/unused";

test("StorageDomainError exposes neutral taxonomy and a stable code", async () => {
  const { StorageDomainError } = await import("./storage");
  const error = new StorageDomainError("conflict", "CAR_DATE_CONFLICT", "overlap");

  assert.equal(error.name, "StorageDomainError");
  assert.equal(error.kind, "conflict");
  assert.equal(error.code, "CAR_DATE_CONFLICT");
  assert.equal(error.message, "overlap");
});

test("resolveRentalAvailabilityTarget preserves omitted availability fields", async () => {
  const { resolveRentalAvailabilityTarget } = await import("./storage");
  const existing = { carId: 10, startDate: "2026-08-01", endDate: "2026-08-05" };

  assert.deepEqual(resolveRentalAvailabilityTarget(existing, { endDate: "2026-08-07" }), {
    carId: 10,
    startDate: "2026-08-01",
    endDate: "2026-08-07",
    changed: true,
  });
  assert.deepEqual(resolveRentalAvailabilityTarget(existing, {}), {
    ...existing,
    changed: false,
  });
});

test("assertRentalCarUnchanged requires audited switching for car changes", async () => {
  const { assertRentalCarUnchanged, StorageDomainError } = await import("./storage");

  assert.doesNotThrow(() => assertRentalCarUnchanged(10, undefined));
  assert.doesNotThrow(() => assertRentalCarUnchanged(10, 10));
  assert.throws(
    () => assertRentalCarUnchanged(10, 11),
    (error: unknown) =>
      error instanceof StorageDomainError &&
      error.kind === "validation" &&
      error.code === "CAR_CHANGE_REQUIRES_SWITCH",
  );
});

test("toSafeUser excludes password and authorization fields", async () => {
  const { toSafeUser } = await import("./storage");
  const projected = toSafeUser({
    id: "manager-1",
    username: "Manager",
    firstName: "Manny",
    lastName: "Ager",
    password: "secret-hash",
    isAdmin: true,
    isManager: true,
  });

  assert.deepEqual(projected, {
    id: "manager-1",
    username: "Manager",
    firstName: "Manny",
    lastName: "Ager",
  });
  assert.equal("password" in projected, false);
  assert.equal("isAdmin" in projected, false);
  assert.equal("isManager" in projected, false);
});

test("car switch audit snapshots contain only operationally required fields", async () => {
  const { createCarSwitchAuditSnapshots } = await import("./storage");
  const snapshots = createCarSwitchAuditSnapshots(
    {
      id: 12,
      totalAmount: "12500.00",
      paymentStatus: "confirmed",
      reservationStatus: "confirmed",
      customerName: "Private Customer",
      paymentScreenshotUrl: "https://private.example/payment.png",
      notes: "Private notes",
    },
    {
      id: 1,
      name: "Old Car",
      plateNumber: "OLD-1",
      monthlyPayment: "private",
    },
    {
      id: 2,
      name: "New Car",
      plateNumber: "NEW-2",
      downPayment: "private",
    },
    "Engine service",
  );

  assert.deepEqual(snapshots, {
    beforeData: {
      rentalId: 12,
      price: "12500.00",
      paymentStatus: "confirmed",
      reservationStatus: "confirmed",
      oldCar: { id: 1, name: "Old Car", plateNumber: "OLD-1" },
    },
    afterData: {
      rentalId: 12,
      price: "12500.00",
      paymentStatus: "confirmed",
      reservationStatus: "confirmed",
      newCar: { id: 2, name: "New Car", plateNumber: "NEW-2" },
      reason: "Engine service",
    },
  });
  const serialized = JSON.stringify(snapshots);
  for (const sensitive of [
    "Private Customer",
    "paymentScreenshotUrl",
    "Private notes",
    "monthlyPayment",
    "downPayment",
  ]) {
    assert.equal(serialized.includes(sensitive), false);
  }
});
