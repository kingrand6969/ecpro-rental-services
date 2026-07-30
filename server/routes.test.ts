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
              rental: { id: 12 },
              switchRecord: {
                id: 1,
                rentalId: 12,
                oldCarId: 1,
                newCarId: 2,
                reason: "Engine service",
                userId: user.id,
                switchedAt: new Date(),
                rental: { id: 12 },
                oldCar: { id: 1 },
                newCar: { id: 2 },
                user: {
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

test("switch and history responses never serialize user passwords", async () => {
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
    oldCarId: 1,
    newCarId: 2,
    reason: "Engine service",
    userId: unsafeUser.id,
    switchedAt: new Date("2026-08-01T00:00:00Z"),
    rental: { id: 12 },
    oldCar: { id: 1 },
    newCar: { id: 2 },
    user: unsafeUser,
  };
  await withTask4Api(
    {
      user: unsafeUser,
      storage: {
        switchRentalCar: async () => ({
          rental: switchRecord.rental,
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
      assert.deepEqual(switched.body.switchRecord.user, {
        id: "manager-1",
        username: "Manager",
        firstName: "Manny",
        lastName: "Ager",
      });
      assert.equal(JSON.stringify(switched.body).includes("secret-hash"), false);

      const history = await jsonRequest(baseUrl, "/api/rentals/12/car-switches");
      assert.equal(history.response.status, 200);
      assert.deepEqual(history.body[0].user, {
        id: "manager-1",
        username: "Manager",
        firstName: "Manny",
        lastName: "Ager",
      });
      assert.equal(JSON.stringify(history.body).includes("secret-hash"), false);
    },
  );
});
