import assert from "node:assert/strict";
import test from "node:test";
import express, { type RequestHandler } from "express";
import { createServer } from "node:http";
import type { InsertRental, Rental } from "@shared/schema";

// Importing route helpers must never connect to production Neon. The storage
// module receives an unreachable placeholder, and every test uses local stubs.
process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/unused";

async function withTask4Api(
  options: {
    user?: Record<string, unknown>;
    storage?: Record<string, unknown>;
  },
  run: (baseUrl: string) => Promise<void>,
) {
  const { registerTask4Routes } = await import("./routes");
  const app = express();
  app.use(express.json());
  const authenticate: RequestHandler = (req: any, res, next) => {
    if (!options.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = options.user;
    next();
  };
  const fakeStorage = {
    getUser: async () => options.user,
    createActivityLog: async () => undefined,
    ...options.storage,
  };
  registerTask4Routes(app, {
    storage: fakeStorage as any,
    isAuthenticated: authenticate,
  });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address === "object");
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

async function withActivityLogApi(
  options: {
    user?: Record<string, unknown>;
    logs?: unknown[];
  },
  run: (baseUrl: string) => Promise<void>,
) {
  const { registerActivityLogRoutes } = await import("./routes");
  const app = express();
  const authenticate: RequestHandler = (req: any, res, next) => {
    if (!options.user) return res.status(401).json({ message: "Unauthorized" });
    req.user = options.user;
    next();
  };
  registerActivityLogRoutes(app, {
    isAuthenticated: authenticate,
    storage: {
      getUser: async () => options.user as any,
      getAllActivityLogs: async () => (options.logs ?? []) as any,
    },
  });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address === "object");
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

async function jsonRequest(baseUrl: string, path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = response.status === 204 ? undefined : await response.json();
  return { response, body };
}

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

test("Task 4 reads require authentication", async () => {
  await withTask4Api(
    {
      storage: {
        getAvailability: async () => assert.fail("unauthenticated storage call"),
      },
    },
    async (baseUrl) => {
      const { response } = await jsonRequest(
        baseUrl,
        "/api/availability?startDate=2026-08-10&endDate=2026-08-12",
      );
      assert.equal(response.status, 401);
    },
  );
});

test("regular users cannot mutate maintenance or switch cars", async () => {
  await withTask4Api(
    {
      user: { id: "user-1", username: "User", isAdmin: false, isManager: false },
      storage: {
        setCarMaintenance: async () => assert.fail("unauthorized maintenance call"),
        switchRentalCar: async () => assert.fail("unauthorized switch call"),
      },
    },
    async (baseUrl) => {
      const maintenance = await jsonRequest(baseUrl, "/api/cars/1/maintenance", {
        method: "PATCH",
        body: JSON.stringify({ reason: "Engine service" }),
      });
      assert.equal(maintenance.response.status, 403);

      const carSwitch = await jsonRequest(baseUrl, "/api/rentals/1/switch-car", {
        method: "POST",
        body: JSON.stringify({ newCarId: 2, reason: "Engine service" }),
      });
      assert.equal(carSwitch.response.status, 403);

      const history = await jsonRequest(baseUrl, "/api/rentals/1/car-switches");
      assert.equal(history.response.status, 403);
    },
  );
});

test("availability remains readable by regular users and returns only safe fields", async () => {
  await withTask4Api(
    {
      user: { id: "user-1", username: "User", isAdmin: false, isManager: false },
      storage: {
        getAvailability: async () => ({
          startDate: "2026-08-10",
          endDate: "2026-08-12",
          available: [],
          maintenance: [],
          booked: [
            {
              id: 2,
              name: "Safe Car",
              brand: "Brand",
              model: "Model",
              plateNumber: "SAFE-2",
              color: "Blue",
              colorCode: "#00f",
              imageUrl: "/safe.png",
              status: "available",
              maintenanceReason: null,
              availability: "booked",
              monthlyPayment: "99999.00",
              downPayment: "50000.00",
              currentMileage: 5000,
              conflictingRental: {
                id: 99,
                customerName: "Private Customer",
                startDate: "2026-08-10",
                endDate: "2026-08-12",
              },
            },
          ],
        }),
      },
    },
    async (baseUrl) => {
      const { response, body } = await jsonRequest(
        baseUrl,
        "/api/availability?startDate=2026-08-10&endDate=2026-08-12",
      );
      assert.equal(response.status, 200);
      assert.deepEqual(body.booked[0], {
        id: 2,
        name: "Safe Car",
        brand: "Brand",
        model: "Model",
        plateNumber: "SAFE-2",
        color: "Blue",
        colorCode: "#00f",
        imageUrl: "/safe.png",
        status: "available",
        maintenanceReason: null,
        availability: "booked",
        conflictingRental: {
          startDate: "2026-08-10",
          endDate: "2026-08-12",
        },
      });
      const serialized = JSON.stringify(body);
      for (const sensitive of ["Private Customer", "monthlyPayment", "downPayment", "currentMileage"]) {
        assert.equal(serialized.includes(sensitive), false);
      }
    },
  );
});

test("regular users cannot read affected rental maintenance details", async () => {
  await withTask4Api(
    {
      user: { id: "user-1", username: "User", isAdmin: false, isManager: false },
      storage: {
        getAffectedRentals: async () => assert.fail("unauthorized affected rentals call"),
      },
    },
    async (baseUrl) => {
      const { response, body } = await jsonRequest(
        baseUrl,
        "/api/cars/1/affected-rentals",
      );
      assert.equal(response.status, 403);
      assert.equal(body.message, "Manager or Admin access required");
    },
  );
});

test("affected rental responses expose only maintenance workflow fields", async () => {
  await withTask4Api(
    {
      user: { id: "manager-1", username: "Manager", isAdmin: false, isManager: true },
      storage: {
        getAffectedRentals: async () => [
          {
            id: 12,
            customerName: "Route Test",
            startDate: "2026-08-10",
            endDate: "2026-08-12",
            paymentStatus: "pending",
            reservationStatus: "confirmed",
            totalAmount: "200.00",
            customerEmail: "private@example.com",
            customerPhone: "555-0100",
            paymentBank: "Private Bank",
            paymentScreenshotUrl: "https://private.example/payment.png",
            notes: "Internal note",
          },
        ],
      },
    },
    async (baseUrl) => {
      const { response, body } = await jsonRequest(
        baseUrl,
        "/api/cars/1/affected-rentals",
      );
      assert.equal(response.status, 200);
      assert.deepEqual(body, [
        {
          id: 12,
          customerName: "Route Test",
          startDate: "2026-08-10",
          endDate: "2026-08-12",
          paymentStatus: "pending",
          reservationStatus: "confirmed",
          totalAmount: "200.00",
        },
      ]);
    },
  );
});

test("Managers and Admins can perform Task 4 mutations", async () => {
  for (const user of [
    { id: "manager-1", username: "Manager", isManager: true, isAdmin: false },
    { id: "admin-1", username: "Admin", isManager: false, isAdmin: true },
  ]) {
    let maintenanceCalls = 0;
    let switchCalls = 0;
    await withTask4Api(
      {
        user,
        storage: {
          getCarById: async () => ({ id: 1, status: "available" }),
          setCarMaintenance: async () => {
            maintenanceCalls += 1;
            return { id: 1, status: "maintenance" };
          },
          switchRentalCar: async () => {
            switchCalls += 1;
            return {
              rentalId: 12,
              newCarId: 2,
              switchRecord: {
                id: 1,
                rentalId: 12,
                reason: "Engine service",
                switchedAt: new Date(),
                oldCar: { id: 1, name: "Old", model: "Model", plateNumber: "OLD-1" },
                newCar: { id: 2, name: "New", model: "Model", plateNumber: "NEW-2" },
                actor: {
                  id: user.id,
                  username: user.username,
                  firstName: null,
                  lastName: null,
                },
              },
            };
          },
        },
      },
      async (baseUrl) => {
        const maintenance = await jsonRequest(baseUrl, "/api/cars/1/maintenance", {
          method: "PATCH",
          body: JSON.stringify({ reason: "Engine service" }),
        });
        assert.equal(maintenance.response.status, 200);

        const carSwitch = await jsonRequest(baseUrl, "/api/rentals/12/switch-car", {
          method: "POST",
          body: JSON.stringify({ newCarId: 2, reason: "Engine service" }),
        });
        assert.equal(carSwitch.response.status, 200);
      },
    );
    assert.equal(maintenanceCalls, 1);
    assert.equal(switchCalls, 1);
  }
});

test("Task 4 endpoints reject malformed ids, ranges, and bodies", async () => {
  await withTask4Api(
    {
      user: { id: "manager-1", username: "Manager", isManager: true },
    },
    async (baseUrl) => {
      const availability = await jsonRequest(
        baseUrl,
        "/api/availability?startDate=2026-08-12&endDate=2026-08-10",
      );
      assert.equal(availability.response.status, 400);

      const maintenance = await jsonRequest(baseUrl, "/api/cars/nope/maintenance", {
        method: "PATCH",
        body: JSON.stringify({ reason: "x" }),
      });
      assert.equal(maintenance.response.status, 400);

      const carSwitch = await jsonRequest(baseUrl, "/api/rentals/0/switch-car", {
        method: "POST",
        body: JSON.stringify({ newCarId: "2", reason: "x" }),
      });
      assert.equal(carSwitch.response.status, 400);
    },
  );
});

test("maintenance returns 404 when the car does not exist", async () => {
  await withTask4Api(
    {
      user: { id: "manager-1", username: "Manager", isManager: true },
      storage: { getCarById: async () => undefined },
    },
    async (baseUrl) => {
      const { response } = await jsonRequest(baseUrl, "/api/cars/99/maintenance", {
        method: "PATCH",
        body: JSON.stringify({ reason: "Engine service" }),
      });
      assert.equal(response.status, 404);
    },
  );
});

test("switch route maps missing records to 404 and conflicts to 409", async () => {
  const { StorageDomainError } = await import("./storage");
  for (const scenario of [
    {
      error: new StorageDomainError("not_found", "CAR_NOT_FOUND", "Missing car"),
      status: 404,
    },
    {
      error: new StorageDomainError("conflict", "CAR_DATE_CONFLICT", "Already booked"),
      status: 409,
    },
  ]) {
    await withTask4Api(
      {
        user: { id: "manager-1", username: "Manager", isManager: true },
        storage: {
          switchRentalCar: async () => {
            throw scenario.error;
          },
        },
      },
      async (baseUrl) => {
        const { response, body } = await jsonRequest(
          baseUrl,
          "/api/rentals/12/switch-car",
          {
            method: "POST",
            body: JSON.stringify({ newCarId: 2, reason: "Engine service" }),
          },
        );
        assert.equal(response.status, scenario.status);
        assert.equal(body.code, scenario.error.code);
      },
    );
  }
});

test("switch and Manager/Admin history responses use narrow safe DTOs", async () => {
  const unsafeUser = {
    id: "manager-1",
    username: "Manager",
    firstName: "Manny",
    lastName: "Ager",
    password: "secret-hash",
    isAdmin: false,
    isManager: true,
  };
  const switchRecord = {
    id: 4,
    rentalId: 12,
    reason: "Engine service",
    switchedAt: new Date("2026-08-01T00:00:00Z"),
    oldCar: {
      id: 1,
      name: "Old Car",
      model: "Old Model",
      plateNumber: "OLD-1",
      monthlyPayment: "private",
    },
    newCar: {
      id: 2,
      name: "New Car",
      model: "New Model",
      plateNumber: "NEW-2",
      downPayment: "private",
    },
    actor: unsafeUser,
  };
  await withTask4Api(
    {
      user: unsafeUser,
      storage: {
        switchRentalCar: async () => ({
          rentalId: 12,
          newCarId: 2,
          switchRecord,
        }),
        getCarSwitchesByRentalId: async () => [switchRecord],
      },
    },
    async (baseUrl) => {
      const switched = await jsonRequest(baseUrl, "/api/rentals/12/switch-car", {
        method: "POST",
        body: JSON.stringify({ newCarId: 2, reason: "Engine service" }),
      });
      assert.equal(switched.response.status, 200);
      assert.equal(switched.body.rentalId, 12);
      assert.equal(switched.body.newCarId, 2);
      assert.deepEqual(switched.body.switchRecord.actor, {
        id: "manager-1",
        username: "Manager",
        firstName: "Manny",
        lastName: "Ager",
      });
      assert.equal(JSON.stringify(switched.body).includes("Private Customer"), false);

      const history = await jsonRequest(baseUrl, "/api/rentals/12/car-switches");
      assert.equal(history.response.status, 200);
      assert.deepEqual(history.body[0], {
        id: 4,
        rentalId: 12,
        reason: "Engine service",
        switchedAt: "2026-08-01T00:00:00.000Z",
        oldCar: { id: 1, name: "Old Car", model: "Old Model", plateNumber: "OLD-1" },
        newCar: { id: 2, name: "New Car", model: "New Model", plateNumber: "NEW-2" },
        actor: {
        id: "manager-1",
        username: "Manager",
        firstName: "Manny",
        lastName: "Ager",
        },
      });
      const serialized = JSON.stringify({ switch: switched.body, history: history.body });
      for (const sensitive of [
        "secret-hash",
        "monthlyPayment",
        "downPayment",
        "paymentScreenshotUrl",
        "Private notes",
      ]) {
        assert.equal(serialized.includes(sensitive), false);
      }
    },
  );
});

test("Admin can read narrow switch history", async () => {
  await withTask4Api(
    {
      user: { id: "admin-1", username: "Admin", isAdmin: true, isManager: false },
      storage: {
        getCarSwitchesByRentalId: async () => [
          {
            id: 5,
            rentalId: 12,
            reason: "Scheduled service",
            switchedAt: new Date("2026-08-02T00:00:00Z"),
            oldCar: { id: 1, name: "Old", model: "A", plateNumber: "OLD-1" },
            newCar: { id: 2, name: "New", model: "B", plateNumber: "NEW-2" },
            actor: {
              id: "manager-1",
              username: "Manager",
              firstName: null,
              lastName: null,
            },
          },
        ],
      },
    },
    async (baseUrl) => {
      const { response, body } = await jsonRequest(baseUrl, "/api/rentals/12/car-switches");
      assert.equal(response.status, 200);
      assert.equal(body[0].rentalId, 12);
      assert.deepEqual(Object.keys(body[0]).sort(), [
        "actor",
        "id",
        "newCar",
        "oldCar",
        "reason",
        "rentalId",
        "switchedAt",
      ]);
    },
  );
});

test("activity-log reads require Admin and return data only to Admin", async () => {
  for (const user of [
    { id: "user-1", isAdmin: false, isManager: false },
    { id: "manager-1", isAdmin: false, isManager: true },
  ]) {
    await withActivityLogApi({ user, logs: [{ id: 1 }] }, async (baseUrl) => {
      const { response, body } = await jsonRequest(baseUrl, "/api/activity-logs");
      assert.equal(response.status, 403);
      assert.equal(body.message, "Admin access required");
    });
  }

  await withActivityLogApi(
    {
      user: { id: "admin-1", isAdmin: true, isManager: false },
      logs: [{ id: 1, entityType: "rental_car_switch" }],
    },
    async (baseUrl) => {
      const { response, body } = await jsonRequest(baseUrl, "/api/activity-logs");
      assert.equal(response.status, 200);
      assert.deepEqual(body, [{ id: 1, entityType: "rental_car_switch" }]);
    },
  );
});
