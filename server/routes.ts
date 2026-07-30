import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import {
  storage,
  StorageDomainError,
  type IStorage,
} from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import {
  insertCarSchema,
  insertRentalSchema,
  insertExpenseSchema,
  insertCustomerSchema,
  type InsertRental,
  type CarSwitchWithDetails,
} from "@shared/schema";
import { z } from "zod";
import type { User } from "@shared/schema";
import { datesConflict, validateDateRange } from "./availability";

type RentalAvailabilityStorage = Pick<
  IStorage,
  "createRentalWithAvailability" | "updateRentalWithAvailability"
>;

export function createRentalThroughAvailability(
  rentalStorage: RentalAvailabilityStorage,
  rental: InsertRental,
) {
  return rentalStorage.createRentalWithAvailability(rental);
}

export function updateRentalThroughAvailability(
  rentalStorage: RentalAvailabilityStorage,
  id: number,
  patch: Partial<InsertRental>,
) {
  return rentalStorage.updateRentalWithAvailability(id, patch);
}

export function storageDomainErrorStatus(error: StorageDomainError): number {
  switch (error.kind) {
    case "not_found":
      return 404;
    case "conflict":
      return 409;
    case "validation":
      return 400;
    case "invariant":
      return 500;
  }
}

type Task4Storage = Pick<
  IStorage,
  | "getUser"
  | "createActivityLog"
  | "getAvailability"
  | "getCarById"
  | "setCarMaintenance"
  | "clearCarMaintenance"
  | "getAffectedRentals"
  | "switchRentalCar"
  | "getCarSwitchesByRentalId"
>;

const availabilityQuery = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  excludeRentalId: z.coerce.number().int().positive().optional(),
});

export function sanitizeCarSwitchDetails(
  record: CarSwitchWithDetails,
): CarSwitchWithDetails {
  const { id, username, firstName, lastName } = record.user;
  return {
    ...record,
    user: { id, username, firstName, lastName },
  };
}

export function registerTask4Routes(
  app: Express,
  dependencies: {
    storage: Task4Storage;
    isAuthenticated: RequestHandler;
  },
): void {
  const taskStorage = dependencies.storage;
  const authenticate = dependencies.isAuthenticated;
  const canManageOperations = (user: User | undefined) =>
    Boolean(user?.isAdmin || user?.isManager);
  const sendDomainError = (res: any, error: StorageDomainError) =>
    res.status(storageDomainErrorStatus(error)).json({
      message: error.message,
      code: error.code,
    });

  app.get("/api/availability", authenticate, async (req, res) => {
    try {
      const query = availabilityQuery.parse(req.query);
      validateDateRange(query.startDate, query.endDate);
      res.json(
        await taskStorage.getAvailability(
          query.startDate,
          query.endDate,
          query.excludeRentalId,
        ),
      );
    } catch (error) {
      if (
        error instanceof z.ZodError ||
        (error instanceof Error && /date|YYYY-MM-DD/i.test(error.message))
      ) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.patch("/api/cars/:id/maintenance", authenticate, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await taskStorage.getUser(userId);
      if (!canManageOperations(user)) {
        return res.status(403).json({ message: "Manager or Admin access required" });
      }
      const id = z.coerce.number().int().positive().parse(req.params.id);
      const body = z
        .object({ reason: z.string().trim().min(3).max(500) })
        .strict()
        .parse(req.body);
      const oldCar = await taskStorage.getCarById(id);
      if (!oldCar) {
        return res.status(404).json({ message: "Car not found" });
      }
      const car = await taskStorage.setCarMaintenance(id, body.reason, userId);
      if (!car) {
        return res.status(404).json({ message: "Car not found" });
      }
      await taskStorage.createActivityLog({
        userId,
        entityType: "car",
        entityId: String(id),
        action: "updated",
        beforeData: oldCar as any,
        afterData: car as any,
      });
      res.json(car);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid maintenance data", errors: error.errors });
      }
      if (error instanceof StorageDomainError) return sendDomainError(res, error);
      console.error("Error setting car maintenance:", error);
      res.status(500).json({ message: "Failed to set car maintenance" });
    }
  });

  app.patch("/api/cars/:id/availability", authenticate, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await taskStorage.getUser(userId);
      if (!canManageOperations(user)) {
        return res.status(403).json({ message: "Manager or Admin access required" });
      }
      const id = z.coerce.number().int().positive().parse(req.params.id);
      z.object({}).strict().parse(req.body ?? {});
      const oldCar = await taskStorage.getCarById(id);
      if (!oldCar) {
        return res.status(404).json({ message: "Car not found" });
      }
      const car = await taskStorage.clearCarMaintenance(id, userId);
      if (!car) {
        return res.status(404).json({ message: "Car not found" });
      }
      await taskStorage.createActivityLog({
        userId,
        entityType: "car",
        entityId: String(id),
        action: "updated",
        beforeData: oldCar as any,
        afterData: car as any,
      });
      res.json(car);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "No availability fields are accepted" });
      }
      if (error instanceof StorageDomainError) return sendDomainError(res, error);
      console.error("Error clearing car maintenance:", error);
      res.status(500).json({ message: "Failed to clear car maintenance" });
    }
  });

  app.get("/api/cars/:id/affected-rentals", authenticate, async (req, res) => {
    try {
      const id = z.coerce.number().int().positive().parse(req.params.id);
      res.json(await taskStorage.getAffectedRentals(id));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid car id" });
      }
      console.error("Error fetching affected rentals:", error);
      res.status(500).json({ message: "Failed to fetch affected rentals" });
    }
  });

  app.get("/api/rentals/:id/car-switches", authenticate, async (req, res) => {
    try {
      const id = z.coerce.number().int().positive().parse(req.params.id);
      const records = await taskStorage.getCarSwitchesByRentalId(id);
      res.json(records.map(sanitizeCarSwitchDetails));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid rental id" });
      }
      if (error instanceof StorageDomainError) return sendDomainError(res, error);
      console.error("Error fetching car switches:", error);
      res.status(500).json({ message: "Failed to fetch car switches" });
    }
  });

  app.post("/api/rentals/:id/switch-car", authenticate, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await taskStorage.getUser(userId);
      if (!canManageOperations(user)) {
        return res.status(403).json({ message: "Manager or Admin access required" });
      }
      const rentalId = z.coerce.number().int().positive().parse(req.params.id);
      const body = z
        .object({
          newCarId: z.number().int().positive(),
          reason: z.string().trim().min(3).max(500),
        })
        .strict()
        .parse(req.body);
      const result = await taskStorage.switchRentalCar({
        rentalId,
        newCarId: body.newCarId,
        reason: body.reason,
        userId,
      });
      res.json({
        ...result,
        switchRecord: sanitizeCarSwitchDetails(result.switchRecord),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid car switch data", errors: error.errors });
      }
      if (error instanceof StorageDomainError) return sendDomainError(res, error);
      console.error("Error switching rental car:", error);
      res.status(500).json({ message: "Failed to switch rental car" });
    }
  });
}

// The rental (if any) on the same car whose dates overlap [start, end].
//
// Same-day handover is allowed: a rental ending on day X does not conflict
// with another starting on day X (returned in the morning, re-rented that
// afternoon). But two same-day rentals on the same date DO conflict — with
// a pure exclusive comparison a start===end booking slips past the guard
// and the car is promised to two customers at once.
//
// Used by both POST and PATCH: without the PATCH check, extending a booking
// in the edit dialog could silently double-book over the next rental.
async function findOverlappingRental(
  carId: number,
  startDate: string,
  endDate: string,
  excludeRentalId?: number,
) {
  const allRentals = await storage.getAllRentals();

  return allRentals.find((existing) => {
    if (existing.carId !== carId) return false;
    if (excludeRentalId !== undefined && existing.id === excludeRentalId) {
      return false;
    }
    return datesConflict(
      existing.startDate,
      existing.endDate,
      startDate,
      endDate,
    );
  });
}

function calculateRentalDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const canManageOperations = (user: User | undefined) =>
    Boolean(user?.isAdmin || user?.isManager);
  const logActivity = async (
    userId: string,
    entityType: string,
    entityId: string | number,
    action: "created" | "updated",
    beforeData: unknown,
    afterData: unknown,
  ) => {
    await storage.createActivityLog({
      userId,
      entityType,
      entityId: String(entityId),
      action,
      beforeData: beforeData as any,
      afterData: afterData as any,
    });
  };

  // Setup local authentication
  setupAuth(app);

  registerTask4Routes(app, { storage, isAuthenticated });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Car routes
  app.get("/api/cars", isAuthenticated, async (req, res) => {
    try {
      const cars = await storage.getAllCars();
      const rentals = await storage.getAllRentals();
      const today = new Date().toISOString().slice(0, 10);
      const activelyRentedCarIds = new Set(
        rentals
          .filter(
            (rental) =>
              !rental.isFinalized &&
              rental.startDate <= today &&
              rental.endDate >= today,
          )
          .map((rental) => rental.carId),
      );
      res.json(
        cars.map((car) => ({
          ...car,
          status:
            car.status === "maintenance"
              ? "maintenance"
              : activelyRentedCarIds.has(car.id)
                ? "rented"
                : "available",
        })),
      );
    } catch (error) {
      console.error("Error fetching cars:", error);
      res.status(500).json({ message: "Failed to fetch cars" });
    }
  });

  // Save a custom display order for cars. Must be registered before
  // /api/cars/:id so "reorder" isn't parsed as an id.
  app.post("/api/cars/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as User).id);
      if (!canManageOperations(user)) {
        return res.status(403).json({ message: "Manager or Admin access required" });
      }
      const bodySchema = z.object({
        carIds: z.array(z.number().int()).min(1),
      });
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "carIds must be a non-empty array of car ids" });
      }
      await storage.reorderCars(parsed.data.carIds);
      const cars = await storage.getAllCars();
      res.json(cars);
    } catch (error) {
      console.error("Error reordering cars:", error);
      res.status(500).json({ message: "Failed to reorder cars" });
    }
  });

  app.get("/api/cars/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const car = await storage.getCarById(id);
      if (!car) {
        return res.status(404).json({ message: "Car not found" });
      }
      res.json(car);
    } catch (error) {
      console.error("Error fetching car:", error);
      res.status(500).json({ message: "Failed to fetch car" });
    }
  });

  app.post("/api/cars", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!canManageOperations(user)) {
        return res.status(403).json({ message: "Manager or Admin access required" });
      }
      if (!user?.isAdmin) {
        req.body.monthlyPayment = "0.00";
        req.body.downPayment = "0.00";
      }
      if (req.body.downPayment !== undefined) {
        const downPayment = z.coerce.number().finite().min(0).max(1_000_000_000).safeParse(req.body.downPayment);
        if (!downPayment.success) {
          return res.status(400).json({ message: "Down payment must be a valid non-negative amount" });
        }
        req.body.downPayment = downPayment.data.toFixed(2);
      }

      const validated = insertCarSchema.parse(req.body);
      const car = await storage.createCar(validated);
      await logActivity(userId, "car", car.id, "created", null, car);
      res.status(201).json(car);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid car data", errors: error.errors });
      }
      console.error("Error creating car:", error);
      res.status(500).json({ message: "Failed to create car" });
    }
  });

  app.patch("/api/cars/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      const id = parseInt(req.params.id);
      if (!canManageOperations(user)) {
        return res.status(403).json({ message: "Manager or Admin access required" });
      }
      const editableCarFields = [
        "name", "brand", "model", "plateNumber", "color", "colorCode",
        "monthlyPayment", "downPayment", "lastOilChangeMileage",
        "currentMileage", "oilChangeIntervalKm", "oilChangeIntervalDays",
        "lastMaintenanceDate", "status", "dateAcquired",
        "registrationConfirmedAt", "imageUrl",
      ];
      req.body = Object.fromEntries(
        Object.entries(req.body).filter(([field]) => editableCarFields.includes(field)),
      );

      if (req.body.monthlyPayment !== undefined) {
        if (!user?.isAdmin) {
          return res.status(403).json({
            message: "Admin access is required to change monthly amortization",
          });
        }

        const monthlyPayment = z.coerce
          .number()
          .finite()
          .min(0)
          .max(100_000_000)
          .safeParse(req.body.monthlyPayment);
        if (!monthlyPayment.success) {
          return res.status(400).json({
            message: "Monthly amortization must be a valid non-negative amount",
          });
        }
        req.body.monthlyPayment = monthlyPayment.data.toFixed(2);
      }

      if (req.body.downPayment !== undefined) {
        if (!user?.isAdmin) {
          return res.status(403).json({
            message: "Admin access is required to change the down payment",
          });
        }

        const downPayment = z.coerce
          .number()
          .finite()
          .min(0)
          .max(1_000_000_000)
          .safeParse(req.body.downPayment);
        if (!downPayment.success) {
          return res.status(400).json({
            message: "Down payment must be a valid non-negative amount",
          });
        }
        req.body.downPayment = downPayment.data.toFixed(2);
      }
      
      // Get current car state BEFORE update to capture old values
      const currentCar = await storage.getCarById(id);
      if (!currentCar) {
        return res.status(404).json({ message: "Car not found" });
      }

      // Capture the old values before update
      const beforeUpdate = { ...currentCar };

      // Perform the update first
      const updatedCar = await storage.updateCar(id, req.body);
      if (!updatedCar) {
        return res.status(500).json({ message: "Failed to update car" });
      }
      await logActivity(userId, "car", id, "updated", beforeUpdate, updatedCar);

      // Log each field change AFTER successful update
      const fieldLabels: Record<string, string> = {
        name: 'Name',
        model: 'Model',
        plateNumber: 'Plate Number',
        color: 'Color',
        colorCode: 'Color Code',
        monthlyPayment: 'Monthly Payment',
        downPayment: 'Down Payment',
        lastOilChangeMileage: 'Last Oil Change Mileage',
        oilChangeIntervalKm: 'Oil Change Interval (km)',
        oilChangeIntervalDays: 'Oil Change Interval (days)',
        lastMaintenanceDate: 'Last Maintenance Date',
        status: 'Status',
        dateAcquired: 'Date Acquired',
        registrationConfirmedAt: 'Registration Confirmed',
        imageUrl: 'Image URL',
      };

      // Compare actual persisted values (updatedCar) with before values
      for (const field of Object.keys(fieldLabels)) {
        const oldValue = (beforeUpdate as any)[field];
        const newValue = (updatedCar as any)[field];
        const oldStr = oldValue !== null && oldValue !== undefined ? String(oldValue) : '';
        const newStr = newValue !== null && newValue !== undefined ? String(newValue) : '';
        
        if (oldStr !== newStr) {
          try {
            await storage.createEditLog({
              carId: id,
              userId,
              fieldName: fieldLabels[field],
              oldValue: oldStr,
              newValue: newStr,
            });
          } catch (logError) {
            console.error(`Failed to create edit log:`, logError);
          }
        }
      }

      res.json(updatedCar);
    } catch (error) {
      console.error("Error updating car:", error);
      res.status(500).json({ message: "Failed to update car" });
    }
  });

  app.delete("/api/cars/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteCar(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting car:", error);
      res.status(500).json({ message: "Failed to delete car" });
    }
  });

  app.post("/api/cars/:id/confirm-registration", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!canManageOperations(user)) {
        return res.status(403).json({ message: "Manager or Admin access required" });
      }

      const id = parseInt(req.params.id);
      const { registrationDate } = req.body;
      const dateValue = registrationDate || new Date().toISOString().split('T')[0];
      const beforeUpdate = await storage.getCarById(id);
      const car = await storage.updateCar(id, { registrationConfirmedAt: dateValue });
      if (!car) {
        return res.status(404).json({ message: "Car not found" });
      }

      await storage.createEditLog({
        carId: id,
        userId,
        fieldName: 'Registration Confirmed',
        oldValue: '',
        newValue: dateValue,
      });
      await logActivity(userId, "car", id, "updated", beforeUpdate, car);

      res.json(car);
    } catch (error) {
      console.error("Error confirming registration:", error);
      res.status(500).json({ message: "Failed to confirm registration" });
    }
  });

  app.post("/api/cars/:id/oil-change", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!canManageOperations(user)) {
        return res.status(403).json({ message: "Manager or Admin access required" });
      }

      const id = parseInt(req.params.id);
      const mileage = req.body.mileage ? parseInt(req.body.mileage) : undefined;
      const beforeUpdate = await storage.getCarById(id);
      const car = await storage.recordOilChange(id, mileage);
      if (!car) {
        return res.status(404).json({ message: "Car not found" });
      }
      await logActivity(userId, "car", id, "updated", beforeUpdate, car);
      res.json(car);
    } catch (error) {
      console.error("Error recording oil change:", error);
      res.status(500).json({ message: "Failed to record oil change" });
    }
  });

  // Customer routes
  app.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomerById(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.get("/api/customers/:id/rentals", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomerById(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      const rentals = await storage.getCustomerRentals(id);
      res.json(rentals);
    } catch (error) {
      console.error("Error fetching customer rentals:", error);
      res.status(500).json({ message: "Failed to fetch customer rentals" });
    }
  });

  app.post("/api/customers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!canManageOperations(user)) {
        return res.status(403).json({ message: "Manager or Admin access required" });
      }
      const validated = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validated);
      await logActivity(userId, "customer", customer.id, "created", null, customer);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!canManageOperations(user)) {
        return res.status(403).json({ message: "Manager or Admin access required" });
      }

      const id = parseInt(req.params.id);
      const beforeUpdate = await storage.getCustomerById(id);
      if (!beforeUpdate) {
        return res.status(404).json({ message: "Customer not found" });
      }
      const validated = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(id, validated);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      await logActivity(userId, "customer", id, "updated", beforeUpdate, customer);
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteCustomer(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Dashboard stats: a single, SQL-computed payload powering the four KPI
  // cards. See `DashboardStats` in shared/schema.ts for income definitions.
  app.get("/api/dashboard/stats", isAuthenticated, async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // What needs attention today. See `DashboardExceptions` in shared/schema.ts.
  app.get("/api/dashboard/exceptions", isAuthenticated, async (_req, res) => {
    try {
      const exceptions = await storage.getDashboardExceptions();
      res.json(exceptions);
    } catch (error) {
      console.error("Error fetching dashboard exceptions:", error);
      res.status(500).json({ message: "Failed to fetch dashboard exceptions" });
    }
  });

  // Monthly income trend: pro-rated income per month for the last 12
  // calendar months, computed in SQL. See `MonthlyIncomePoint` in
  // shared/schema.ts for the definition.
  app.get("/api/dashboard/income-trend", isAuthenticated, async (_req, res) => {
    try {
      const trend = await storage.getMonthlyIncomeTrend();
      res.json(trend);
    } catch (error) {
      console.error("Error fetching income trend:", error);
      res.status(500).json({ message: "Failed to fetch income trend" });
    }
  });

  // Rental routes
  app.get("/api/rentals", isAuthenticated, async (req, res) => {
    try {
      // Optional from/to (YYYY-MM-DD) narrow results to rentals overlapping
      // that window in SQL. Without params, all rentals are returned so
      // existing callers keep working.
      const rangeSchema = z.object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      });
      const parsed = rangeSchema.safeParse({
        from: req.query.from,
        to: req.query.to,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid from/to date; expected YYYY-MM-DD" });
      }
      const { from, to } = parsed.data;
      const rentals =
        from || to
          ? await storage.getRentalsInRange(from, to)
          : await storage.getAllRentals();
      res.json(rentals);
    } catch (error) {
      console.error("Error fetching rentals:", error);
      res.status(500).json({ message: "Failed to fetch rentals" });
    }
  });

  // Get non-finalized rentals that need finalization reminder (12+ hours since last reminder)
  // This must come BEFORE /api/rentals/:id to avoid route matching issues
  app.get("/api/rentals/pending-finalization", isAuthenticated, async (req, res) => {
    try {
      const rentals = await storage.getRentalsNeedingFinalizeReminder();
      res.json(rentals);
    } catch (error) {
      console.error("Error fetching rentals needing finalization:", error);
      res.status(500).json({ message: "Failed to fetch rentals" });
    }
  });

  app.get("/api/rentals/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rental = await storage.getRentalById(id);
      if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
      }
      res.json(rental);
    } catch (error) {
      console.error("Error fetching rental:", error);
      res.status(500).json({ message: "Failed to fetch rental" });
    }
  });

  app.post("/api/rentals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const requester = await storage.getUser(userId);
      if (!canManageOperations(requester)) {
        return res.status(403).json({ message: "Manager or Admin access required" });
      }

      // Only the dedicated "Admin" superuser can create a rental that is already finalized
      if (req.body?.isFinalized === true && requester?.username !== "Admin") {
        return res.status(403).json({
          message: "Only the Admin user can finalize rentals",
        });
      }

      // Harden against bypass via the DB default: any creation must explicitly
      // start as "pending" unless the literal Admin user is creating a
      // pre-confirmed rental. We force the field server-side so the schema
      // default cannot silently produce a confirmed payment.
      if (req.body?.paymentStatus !== "confirmed") {
        req.body.paymentStatus = "pending";
        req.body.paymentDate = null;
        req.body.paymentBank = null;
      }

      // If the rental is being created with the FULL/total payment already
      // confirmed, payment date + bank are required AND only the literal "Admin"
      // user is allowed to do this.
      if (req.body?.paymentStatus === "confirmed") {
        if (requester?.username !== "Admin") {
          return res.status(403).json({
            message: "Only the Admin user can confirm the total payment",
          });
        }
        const incomingDate = req.body?.paymentDate;
        const incomingBank = req.body?.paymentBank;
        if (!incomingDate || !String(incomingBank ?? "").trim()) {
          return res.status(400).json({
            message: "Payment date and bank are required to confirm a payment",
          });
        }
      }

      // If the rental is being created with the reservation already confirmed,
      // reservation date + bank are required (any approved user may do this).
      if (req.body?.reservationStatus === "confirmed") {
        const rDate = req.body?.reservationDate;
        const rBank = req.body?.reservationBank;
        if (!rDate || !String(rBank ?? "").trim()) {
          return res.status(400).json({
            message: "Reservation date and bank are required to confirm a reservation",
          });
        }
      }

      const rentalData = {
        ...req.body,
        userId,
      };
      const validated = insertRentalSchema.parse(rentalData);
      if (validated.endDate < validated.startDate) {
        return res.status(400).json({
          message: "Rental end date cannot be before the start date",
        });
      }
      validated.daysRented = calculateRentalDays(
        validated.startDate as string,
        validated.endDate as string,
      );

      const rental = await createRentalThroughAvailability(storage, validated);
      await logActivity(userId, "rental", rental.id, "created", null, rental);
      
      // Log the rental creation
      const car = await storage.getCarById(rental.carId);
      await storage.createRentalLog({
        rentalId: rental.id,
        carId: rental.carId,
        userId,
        action: "created",
        customerName: rental.customerName,
        startDate: rental.startDate,
        endDate: rental.endDate,
        totalAmount: rental.totalAmount,
        carName: car?.name || "Unknown",
      });
      
      res.status(201).json(rental);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid rental data", errors: error.errors });
      }
      if (error instanceof StorageDomainError) {
        return res.status(storageDomainErrorStatus(error)).json({
          message: error.message,
          code: error.code,
        });
      }
      console.error("Error creating rental:", error);
      res.status(500).json({ message: "Failed to create rental" });
    }
  });

  app.patch("/api/rentals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      const id = parseInt(req.params.id);
      const existing = await storage.getRentalById(id);

      if (!existing) {
        return res.status(404).json({ message: "Rental not found" });
      }
      if (!canManageOperations(user)) {
        return res.status(403).json({ message: "Manager or Admin access required" });
      }
      const editableRentalFields = [
        "carId", "customerId", "customerName", "customerPhone", "customerEmail",
        "startDate", "endDate", "daysRented", "totalAmount", "paymentStatus", "paymentDate",
        "paymentBank", "paymentScreenshotUrl", "reservationFee",
        "reservationStatus", "reservationDate", "reservationBank",
        "reservationScreenshotUrl", "isFinalized", "notes",
      ];
      req.body = Object.fromEntries(
        Object.entries(req.body).filter(([field]) => editableRentalFields.includes(field)),
      );

      // Only admin can edit finalized rentals
      if (existing.isFinalized && !user?.isAdmin) {
        return res.status(403).json({ message: "Only admin can edit finalized rentals" });
      }

      // Only the dedicated "Admin" superuser can change isFinalized
      if (
        req.body.isFinalized !== undefined &&
        Boolean(req.body.isFinalized) !== Boolean(existing.isFinalized) &&
        user?.username !== "Admin"
      ) {
        return res.status(403).json({
          message: "Only the Admin user can finalize or un-finalize rentals",
        });
      }

      // A confirmed (full/total) payment must always have both paymentDate and
      // paymentBank. Additionally, only the literal "Admin" user may TRANSITION
      // the payment from pending → confirmed.
      const resultingStatus =
        req.body.paymentStatus !== undefined
          ? req.body.paymentStatus
          : existing.paymentStatus;
      const isPaymentTransitionToConfirmed =
        req.body.paymentStatus !== undefined &&
        req.body.paymentStatus === "confirmed" &&
        existing.paymentStatus !== "confirmed";
      if (isPaymentTransitionToConfirmed && user?.username !== "Admin") {
        return res.status(403).json({
          message: "Only the Admin user can confirm the total payment",
        });
      }
      if (resultingStatus === "confirmed") {
        const incomingDate =
          req.body.paymentDate !== undefined
            ? req.body.paymentDate
            : existing.paymentDate;
        const incomingBank =
          req.body.paymentBank !== undefined
            ? req.body.paymentBank
            : existing.paymentBank;
        if (!incomingDate || !String(incomingBank ?? "").trim()) {
          return res.status(400).json({
            message: "Payment date and bank are required for a confirmed payment",
          });
        }
      }

      // Availability-sensitive edits are validated again inside a serialized
      // storage transaction. Car changes must use the audited switch endpoint.
      if (
        req.body.carId !== undefined ||
        req.body.startDate !== undefined ||
        req.body.endDate !== undefined
      ) {
        const nextStart = req.body.startDate ?? existing.startDate;
        const nextEnd = req.body.endDate ?? existing.endDate;
        const nextCarId = req.body.carId ?? existing.carId;
        if (nextEnd < nextStart) {
          return res.status(400).json({
            message: "Rental end date cannot be before the start date",
          });
        }
        req.body.daysRented = calculateRentalDays(nextStart, nextEnd);
      }

      // A confirmed reservation must always have both reservationDate and
      // reservationBank. Any approved user may confirm a reservation.
      const resultingReservationStatus =
        req.body.reservationStatus !== undefined
          ? req.body.reservationStatus
          : existing.reservationStatus;
      if (resultingReservationStatus === "confirmed") {
        const rDate =
          req.body.reservationDate !== undefined
            ? req.body.reservationDate
            : existing.reservationDate;
        const rBank =
          req.body.reservationBank !== undefined
            ? req.body.reservationBank
            : existing.reservationBank;
        if (!rDate || !String(rBank ?? "").trim()) {
          return res.status(400).json({
            message: "Reservation date and bank are required for a confirmed reservation",
          });
        }
      }

      const rental = await updateRentalThroughAvailability(storage, id, req.body);
      await logActivity(userId, "rental", id, "updated", existing, rental);

      // Log each changed field
      const car = await storage.getCarById(existing.carId);
      const fieldsToCheck = ['customerName', 'startDate', 'endDate', 'totalAmount', 'isFinalized', 'paymentStatus', 'paymentDate', 'paymentBank', 'reservationFee', 'reservationStatus', 'reservationDate', 'reservationBank', 'notes', 'customerPhone', 'customerEmail'];
      
      for (const field of fieldsToCheck) {
        if (req.body[field] !== undefined && String(req.body[field]) !== String((existing as any)[field])) {
          await storage.createRentalLog({
            rentalId: id,
            carId: existing.carId,
            userId,
            action: "updated",
            fieldName: field,
            oldValue: String((existing as any)[field] ?? ''),
            newValue: String(req.body[field]),
            customerName: rental?.customerName || existing.customerName,
            startDate: rental?.startDate || existing.startDate,
            endDate: rental?.endDate || existing.endDate,
            totalAmount: rental?.totalAmount || existing.totalAmount,
            carName: car?.name || "Unknown",
          });
        }
      }
      
      res.json(rental);
    } catch (error) {
      if (error instanceof StorageDomainError) {
        return res.status(storageDomainErrorStatus(error)).json({
          message: error.message,
          code: error.code,
        });
      }
      console.error("Error updating rental:", error);
      res.status(500).json({ message: "Failed to update rental" });
    }
  });

  app.delete("/api/rentals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const existing = await storage.getRentalById(id);
      if (await storage.hasCarSwitchesForRental(id)) {
        return res.status(409).json({
          message: "Rentals with car switch history cannot be deleted",
        });
      }
      
      if (existing) {
        // Log the deletion before actually deleting
        const car = await storage.getCarById(existing.carId);
        await storage.createRentalLog({
          rentalId: null, // Set to null since rental will be deleted
          carId: existing.carId,
          userId,
          action: "deleted",
          customerName: existing.customerName,
          startDate: existing.startDate,
          endDate: existing.endDate,
          totalAmount: existing.totalAmount,
          carName: car?.name || "Unknown",
        });
      }
      
      await storage.deleteRental(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting rental:", error);
      res.status(500).json({ message: "Failed to delete rental" });
    }
  });

  // Update last finalize reminder timestamp (dismiss reminder for 12 hours)
  app.post("/api/rentals/:id/dismiss-reminder", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const rental = await storage.updateFinalizeReminder(id);
      if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
      }
      res.json(rental);
    } catch (error) {
      console.error("Error dismissing reminder:", error);
      res.status(500).json({ message: "Failed to dismiss reminder" });
    }
  });

  // Expense routes
  app.get("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const expenses = await storage.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/cars/:carId/expenses", isAuthenticated, async (req, res) => {
    try {
      const carId = parseInt(req.params.carId);
      const expenses = await storage.getExpensesByCarId(carId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching car expenses:", error);
      res.status(500).json({ message: "Failed to fetch car expenses" });
    }
  });

  app.post("/api/expenses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!canManageOperations(user)) {
        return res.status(403).json({ message: "Manager or Admin access required" });
      }
      const expenseData = {
        ...req.body,
        userId,
      };
      const validated = insertExpenseSchema.parse(expenseData);
      const expense = await storage.createExpense(validated);
      await logActivity(userId, "expense", expense.id, "created", null, expense);

      // If category is "Oil Change", update the car's lastOilChangeMileage
      if (expense.category === "Oil Change" && expense.mileageAtExpense && expense.carId) {
        const car = await storage.getCarById(expense.carId);
        if (car) {
          await storage.updateCar(expense.carId, {
            lastOilChangeMileage: expense.mileageAtExpense,
            lastMaintenanceDate: new Date().toISOString().split('T')[0],
          });
        }
      }

      // Log expense creation
      try {
        const car = await storage.getCarById(expense.carId);
        await storage.createExpenseLog({
          expenseId: expense.id,
          carId: expense.carId,
          userId,
          action: "created",
          fieldName: null,
          oldValue: null,
          newValue: null,
          category: expense.category,
          description: expense.description,
          amount: expense.amount?.toString() || null,
          expenseDate: expense.expenseDate,
          mileageAtExpense: expense.mileageAtExpense?.toString() || null,
          carName: car?.name || null,
        });
      } catch (logError) {
        console.error("Error logging expense creation:", logError);
      }

      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.patch("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!canManageOperations(user)) {
        return res.status(403).json({ message: "Manager or Admin access required" });
      }

      const id = parseInt(req.params.id);

      const existing = await storage.getExpenseById(id);
      if (!existing) {
        return res.status(404).json({ message: "Expense not found" });
      }

      // Whitelist editable fields and validate
      const editableFields = ["category", "description", "amount", "expenseDate", "mileageAtExpense"] as const;
      const updateData: Record<string, unknown> = {};
      for (const field of editableFields) {
        if (field in req.body) updateData[field] = req.body[field];
      }
      const validated = insertExpenseSchema.partial().parse(updateData);

      const updated = await storage.updateExpense(id, validated);
      if (!updated) {
        return res.status(404).json({ message: "Expense not found" });
      }
      await logActivity(userId, "expense", id, "updated", existing, updated);

      // Log each changed field
      try {
        const car = await storage.getCarById(updated.carId);
        const fieldsToCheck: (keyof typeof existing)[] = [
          "category",
          "description",
          "amount",
          "expenseDate",
          "mileageAtExpense",
        ];
        for (const field of fieldsToCheck) {
          const oldVal = existing[field];
          const newVal = (updated as any)[field];
          const oldStr = oldVal === null || oldVal === undefined ? null : String(oldVal);
          const newStr = newVal === null || newVal === undefined ? null : String(newVal);
          if (oldStr !== newStr) {
            await storage.createExpenseLog({
              expenseId: updated.id,
              carId: updated.carId,
              userId,
              action: "updated",
              fieldName: field as string,
              oldValue: oldStr,
              newValue: newStr,
              category: updated.category,
              description: updated.description,
              amount: updated.amount?.toString() || null,
              expenseDate: updated.expenseDate,
              mileageAtExpense: updated.mileageAtExpense?.toString() || null,
              carName: car?.name || null,
            });
          }
        }
      } catch (logError) {
        console.error("Error logging expense update:", logError);
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);

      // Capture snapshot before deletion for logging
      const existing = await storage.getExpenseById(id);

      await storage.deleteExpense(id);

      if (existing) {
        try {
          const car = await storage.getCarById(existing.carId);
          await storage.createExpenseLog({
            expenseId: null,
            carId: existing.carId,
            userId,
            action: "deleted",
            fieldName: null,
            oldValue: null,
            newValue: null,
            category: existing.category,
            description: existing.description,
            amount: existing.amount?.toString() || null,
            expenseDate: existing.expenseDate,
            mileageAtExpense: existing.mileageAtExpense?.toString() || null,
            carName: car?.name || null,
          });
        } catch (logError) {
          console.error("Error logging expense deletion:", logError);
        }
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Monthly payments
  app.get("/api/monthly-payments", isAuthenticated, async (req, res) => {
    try {
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const payments = await storage.getMonthlyPayments(month, year);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching monthly payments:", error);
      res.status(500).json({ message: "Failed to fetch monthly payments" });
    }
  });

  // Edit log routes
  app.get("/api/edit-logs", isAuthenticated, async (req, res) => {
    try {
      const logs = await storage.getAllEditLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching edit logs:", error);
      res.status(500).json({ message: "Failed to fetch edit logs" });
    }
  });

  app.get("/api/cars/:carId/edit-logs", isAuthenticated, async (req, res) => {
    try {
      const carId = parseInt(req.params.carId);
      const logs = await storage.getEditLogsByCarId(carId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching car edit logs:", error);
      res.status(500).json({ message: "Failed to fetch car edit logs" });
    }
  });

  // Rental log routes
  app.get("/api/rental-logs", isAuthenticated, async (req, res) => {
    try {
      const logs = await storage.getAllRentalLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching rental logs:", error);
      res.status(500).json({ message: "Failed to fetch rental logs" });
    }
  });

  // Expense log routes
  app.get("/api/expense-logs", isAuthenticated, async (req, res) => {
    try {
      const logs = await storage.getAllExpenseLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching expense logs:", error);
      res.status(500).json({ message: "Failed to fetch expense logs" });
    }
  });

  app.get("/api/cars/:carId/expense-logs", isAuthenticated, async (req, res) => {
    try {
      const carId = parseInt(req.params.carId);
      const logs = await storage.getExpenseLogsByCarId(carId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching car expense logs:", error);
      res.status(500).json({ message: "Failed to fetch car expense logs" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id/toggle-admin", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = (req.user as User).id;
      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetId = req.params.id;
      if (targetId === currentUserId) {
        return res.status(400).json({ message: "Cannot modify your own admin status" });
      }

      const user = await storage.toggleUserAdmin(targetId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error toggling admin:", error);
      res.status(500).json({ message: "Failed to toggle admin status" });
    }
  });

  app.get("/api/activity-logs", isAuthenticated, async (_req, res) => {
    try {
      const logs = await storage.getAllActivityLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  app.patch("/api/admin/users/:id/toggle-manager", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = (req.user as User).id;
      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetId = req.params.id;
      if (targetId === currentUserId) {
        return res.status(400).json({ message: "You cannot change your own manager role" });
      }

      const user = await storage.toggleUserManager(targetId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error toggling manager status:", error);
      res.status(500).json({ message: "Failed to update manager status" });
    }
  });

  app.patch("/api/admin/users/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = (req.user as User).id;
      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetId = req.params.id;
      const user = await storage.approveUser(targetId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Failed to approve user" });
    }
  });

  app.get("/api/admin/pending-users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const pendingUsers = await storage.getPendingUsers();
      res.json(pendingUsers);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Failed to fetch pending users" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.delete("/api/admin/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = (req.user as User).id;
      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetId = req.params.id;
      if (targetId === currentUserId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await storage.deleteUser(targetId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.post("/api/admin/users/:id/reset-password", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = (req.user as User).id;
      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { hashPassword } = await import("./auth");
      const targetId = req.params.id;
      const defaultPassword = "12345678";
      const hashedPassword = await hashPassword(defaultPassword);
      
      const user = await storage.updateUserPassword(targetId, hashedPassword, true);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "Password reset to default. User must change password on next login." });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.post("/api/user/change-password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { currentPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.password) {
        return res.status(404).json({ message: "User not found" });
      }

      const { comparePasswords, hashPassword } = await import("./auth");
      
      // Skip current password check if user must change password (was reset by admin)
      if (!user.mustChangePassword) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required" });
        }
        const isValid = await comparePasswords(currentPassword, user.password);
        if (!isValid) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, hashedPassword, false);
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Object storage routes
  const objectStorageService = new ObjectStorageService();

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    try {
      await objectStorageService.downloadObject(req.path, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      if (!res.headersSent) {
        return res.sendStatus(500);
      }
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const { uploadURL, objectPath } =
        await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.put("/api/payment-screenshots", isAuthenticated, async (req: any, res) => {
    try {
      if (!req.body.screenshotURL) {
        return res.status(400).json({ error: "screenshotURL is required" });
      }

      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.screenshotURL,
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting payment screenshot:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return httpServer;
}
