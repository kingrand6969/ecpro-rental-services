import {
  users,
  cars,
  rentals,
  expenses,
  monthlyPayments,
  customers,
  editLogs,
  rentalLogs,
  expenseLogs,
  activityLogs,
  carSwitches,
  type User,
  type UpsertUser,
  type Car,
  type InsertCar,
  type Rental,
  type InsertRental,
  type Expense,
  type InsertExpense,
  type MonthlyPayment,
  type InsertMonthlyPayment,
  type Customer,
  type InsertCustomer,
  type EditLog,
  type InsertEditLog,
  type EditLogWithDetails,
  type RentalLog,
  type InsertRentalLog,
  type RentalLogWithUser,
  type ExpenseLog,
  type InsertExpenseLog,
  type ExpenseLogWithUser,
  type ActivityLog,
  type InsertActivityLog,
  type ActivityLogWithUser,
  type DashboardStats,
  type DashboardExceptions,
  type MonthlyIncomePoint,
  type AvailabilityResponse,
  type AffectedRental,
  type CarSwitchWithDetails,
  type SafeUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, ne, inArray, sql } from "drizzle-orm";
import { classifyCarAvailability, datesConflict, validateDateRange } from "./availability";

export type StorageDomainErrorKind = "not_found" | "conflict" | "validation" | "invariant";

export type StorageDomainErrorCode =
  | "RENTAL_NOT_FOUND"
  | "CAR_NOT_FOUND"
  | "OLD_CAR_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "RENTAL_FINALIZED"
  | "SAME_CAR"
  | "CAR_IN_MAINTENANCE"
  | "CAR_DATE_CONFLICT"
  | "MAINTENANCE_REASON_REQUIRED"
  | "MAINTENANCE_USER_REQUIRED"
  | "SWITCH_REASON_REQUIRED"
  | "SWITCH_USER_REQUIRED"
  | "INVALID_RENTAL_DATES"
  | "CAR_CHANGE_REQUIRES_SWITCH"
  | "CAR_SWITCH_DETAILS_RELOAD_FAILED"
  | "CAR_SWITCH_DETAILS_MISSING";

export class StorageDomainError extends Error {
  constructor(
    public readonly kind: StorageDomainErrorKind,
    public readonly code: StorageDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "StorageDomainError";
  }
}

export function toSafeUser(
  user: Pick<User, "id" | "username" | "firstName" | "lastName">,
): SafeUser {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

const safeUserSelection = {
  id: users.id,
  username: users.username,
  firstName: users.firstName,
  lastName: users.lastName,
};

function validateRentalDateRange(startDate: string, endDate: string): void {
  try {
    validateDateRange(startDate, endDate);
  } catch (error) {
    throw new StorageDomainError(
      "validation",
      "INVALID_RENTAL_DATES",
      error instanceof Error ? error.message : "Invalid rental dates",
    );
  }
}

export function resolveRentalAvailabilityTarget(
  existing: Pick<Rental, "carId" | "startDate" | "endDate">,
  patch: Partial<Pick<InsertRental, "carId" | "startDate" | "endDate">>,
): {
  carId: number;
  startDate: string;
  endDate: string;
  changed: boolean;
} {
  const carId = patch.carId ?? existing.carId;
  const startDate = patch.startDate ?? existing.startDate;
  const endDate = patch.endDate ?? existing.endDate;
  return {
    carId,
    startDate,
    endDate,
    changed:
      carId !== existing.carId ||
      startDate !== existing.startDate ||
      endDate !== existing.endDate,
  };
}

export function assertRentalCarUnchanged(
  existingCarId: number,
  requestedCarId: number | undefined,
): void {
  if (requestedCarId !== undefined && requestedCarId !== existingCarId) {
    throw new StorageDomainError(
      "validation",
      "CAR_CHANGE_REQUIRES_SWITCH",
      "Rental car changes must use the audited car switch operation",
    );
  }
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(userData: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  toggleUserAdmin(id: string): Promise<User | undefined>;
  toggleUserManager(id: string): Promise<User | undefined>;
  approveUser(id: string): Promise<User | undefined>;
  getPendingUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;
  updateUserPassword(id: string, hashedPassword: string, mustChangePassword?: boolean): Promise<User | undefined>;
  setMustChangePassword(id: string, mustChange: boolean): Promise<User | undefined>;

  // Customer operations
  getAllCustomers(): Promise<Customer[]>;
  getCustomerById(id: number): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<void>;
  getCustomerRentals(customerId: number): Promise<Rental[]>;

  // Car operations
  getAllCars(): Promise<Car[]>;
  reorderCars(carIds: number[]): Promise<void>;
  getCarById(id: number): Promise<Car | undefined>;
  createCar(car: InsertCar): Promise<Car>;
  updateCar(id: number, car: Partial<InsertCar>): Promise<Car | undefined>;
  deleteCar(id: number): Promise<void>;
  recordOilChange(id: number): Promise<Car | undefined>;
  getAvailability(startDate: string, endDate: string, excludeRentalId?: number): Promise<AvailabilityResponse>;
  getAffectedRentals(carId: number): Promise<AffectedRental[]>;
  setCarMaintenance(carId: number, reason: string, userId: string): Promise<Car | undefined>;
  clearCarMaintenance(carId: number, userId: string): Promise<Car | undefined>;

  // Rental operations
  getAllRentals(): Promise<Rental[]>;
  getRentalsInRange(from?: string, to?: string): Promise<Rental[]>;
  getRentalById(id: number): Promise<Rental | undefined>;
  createRental(rental: InsertRental): Promise<Rental>;
  updateRental(id: number, rental: Partial<InsertRental>): Promise<Rental | undefined>;
  createRentalWithAvailability(rental: InsertRental): Promise<Rental>;
  updateRentalWithAvailability(id: number, patch: Partial<InsertRental>): Promise<Rental>;
  deleteRental(id: number): Promise<void>;
  getRentalsNeedingFinalizeReminder(): Promise<Rental[]>;
  updateFinalizeReminder(id: number): Promise<Rental | undefined>;
  switchRentalCar(input: {
    rentalId: number;
    newCarId: number;
    reason: string;
    userId: string;
  }): Promise<{ rental: Rental; switchRecord: CarSwitchWithDetails }>;
  getCarSwitchesByRentalId(rentalId: number): Promise<CarSwitchWithDetails[]>;
  hasCarSwitchesForRental(rentalId: number): Promise<boolean>;

  // Expense operations
  getAllExpenses(): Promise<Expense[]>;
  getExpensesByCarId(carId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;

  // Monthly payment operations
  getMonthlyPayments(month: number, year: number): Promise<MonthlyPayment[]>;
  createOrUpdateMonthlyPayment(payment: InsertMonthlyPayment): Promise<MonthlyPayment>;

  // Edit log operations
  getAllEditLogs(): Promise<EditLogWithDetails[]>;
  getEditLogsByCarId(carId: number): Promise<EditLogWithDetails[]>;
  createEditLog(log: InsertEditLog): Promise<EditLog>;

  // Rental log operations
  getAllRentalLogs(): Promise<RentalLogWithUser[]>;
  createRentalLog(log: InsertRentalLog): Promise<RentalLog>;

  // Expense log operations
  getAllExpenseLogs(): Promise<ExpenseLogWithUser[]>;
  getExpenseLogsByCarId(carId: number): Promise<ExpenseLogWithUser[]>;
  createExpenseLog(log: InsertExpenseLog): Promise<ExpenseLog>;
  getAllActivityLogs(): Promise<ActivityLogWithUser[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  getExpenseById(id: number): Promise<Expense | undefined>;

  // Stats
  getStats(): Promise<{
    totalUsers: number;
    totalCars: number;
    totalRentals: number;
    activeRentals: number;
    totalCustomers: number;
  }>;
  getDashboardStats(): Promise<DashboardStats>;
  getDashboardExceptions(): Promise<DashboardExceptions>;
  getMonthlyIncomeTrend(): Promise<MonthlyIncomePoint[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async toggleUserAdmin(id: string): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const [updated] = await db
      .update(users)
      .set({ isAdmin: !user.isAdmin, isManager: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async toggleUserManager(id: string): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const [updated] = await db
      .update(users)
      .set({ isManager: !user.isManager, isAdmin: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async approveUser(id: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ isApproved: true, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getPendingUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.isApproved, false)).orderBy(desc(users.createdAt));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updateUserPassword(id: string, hashedPassword: string, mustChangePassword: boolean = false): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ password: hashedPassword, mustChangePassword, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async setMustChangePassword(id: string, mustChange: boolean): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ mustChangePassword: mustChange, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  // Customer operations
  async getAllCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updated;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  async getCustomerRentals(customerId: number): Promise<Rental[]> {
    return db
      .select()
      .from(rentals)
      .where(eq(rentals.customerId, customerId))
      .orderBy(desc(rentals.createdAt));
  }

  // Car operations
  async getAllCars(): Promise<Car[]> {
    // Custom display order first (nulls last), falling back to newest-first
    // for cars without an assigned order.
    return db
      .select()
      .from(cars)
      .orderBy(sql`${cars.displayOrder} ASC NULLS LAST`, desc(cars.createdAt));
  }

  async reorderCars(carIds: number[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < carIds.length; i++) {
        await tx
          .update(cars)
          .set({ displayOrder: i, updatedAt: new Date() })
          .where(eq(cars.id, carIds[i]));
      }
    });
  }

  async getCarById(id: number): Promise<Car | undefined> {
    const [car] = await db.select().from(cars).where(eq(cars.id, id));
    return car;
  }

  async createCar(car: InsertCar): Promise<Car> {
    const [created] = await db.insert(cars).values(car).returning();
    return created;
  }

  async updateCar(id: number, car: Partial<InsertCar>): Promise<Car | undefined> {
    const [updated] = await db
      .update(cars)
      .set({ ...car, updatedAt: new Date() })
      .where(eq(cars.id, id))
      .returning();
    return updated;
  }

  async deleteCar(id: number): Promise<void> {
    await db.delete(cars).where(eq(cars.id, id));
  }

  async recordOilChange(id: number, mileage?: number): Promise<Car | undefined> {
    const car = await this.getCarById(id);
    if (!car) return undefined;

    const newMileage = mileage ?? car.lastOilChangeMileage ?? 0;
    const [updated] = await db
      .update(cars)
      .set({
        lastOilChangeMileage: newMileage,
        currentMileage: newMileage,
        lastMaintenanceDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date(),
      })
      .where(eq(cars.id, id))
      .returning();
    return updated;
  }

  async getAvailability(
    startDate: string,
    endDate: string,
    excludeRentalId?: number,
  ): Promise<AvailabilityResponse> {
    validateDateRange(startDate, endDate);
    const [allCars, allRentals] = await Promise.all([
      db.select().from(cars).orderBy(sql`${cars.displayOrder} ASC NULLS LAST`, desc(cars.createdAt)),
      this.getRentalsInRange(startDate, endDate),
    ]);
    const rentalsByCarId = new Map<number, Rental[]>();
    for (const rental of allRentals) {
      const grouped = rentalsByCarId.get(rental.carId);
      if (grouped) grouped.push(rental);
      else rentalsByCarId.set(rental.carId, [rental]);
    }
    const response: AvailabilityResponse = {
      startDate,
      endDate,
      available: [],
      booked: [],
      maintenance: [],
    };

    for (const car of allCars) {
      const classified = classifyCarAvailability(
        car,
        rentalsByCarId.get(car.id) ?? [],
        startDate,
        endDate,
        excludeRentalId,
      );
      response[classified.availability].push(classified);
    }

    return response;
  }

  async getAffectedRentals(carId: number): Promise<AffectedRental[]> {
    return db
      .select({
        id: rentals.id,
        customerName: rentals.customerName,
        startDate: rentals.startDate,
        endDate: rentals.endDate,
        paymentStatus: rentals.paymentStatus,
        totalAmount: rentals.totalAmount,
      })
      .from(rentals)
      .where(
        and(
          eq(rentals.carId, carId),
          eq(rentals.isFinalized, false),
          gte(rentals.endDate, sql`CURRENT_DATE`),
        ),
      )
      .orderBy(asc(rentals.startDate));
  }

  async setCarMaintenance(
    carId: number,
    reason: string,
    userId: string,
  ): Promise<Car | undefined> {
    const maintenanceReason = reason.trim();
    const maintenanceUpdatedBy = userId.trim();
    if (!maintenanceReason) {
      throw new StorageDomainError(
        "validation",
        "MAINTENANCE_REASON_REQUIRED",
        "Maintenance reason is required",
      );
    }
    if (!maintenanceUpdatedBy) {
      throw new StorageDomainError(
        "validation",
        "MAINTENANCE_USER_REQUIRED",
        "Maintenance user is required",
      );
    }

    const now = new Date();
    const [updated] = await db
      .update(cars)
      .set({
        status: "maintenance",
        maintenanceReason,
        maintenanceUpdatedAt: now,
        maintenanceUpdatedBy,
        updatedAt: now,
      })
      .where(eq(cars.id, carId))
      .returning();
    return updated;
  }

  async clearCarMaintenance(carId: number, userId: string): Promise<Car | undefined> {
    const maintenanceUpdatedBy = userId.trim();
    if (!maintenanceUpdatedBy) {
      throw new StorageDomainError(
        "validation",
        "MAINTENANCE_USER_REQUIRED",
        "Maintenance user is required",
      );
    }

    const now = new Date();
    const [updated] = await db
      .update(cars)
      .set({
        status: "available",
        maintenanceReason: null,
        maintenanceUpdatedAt: now,
        maintenanceUpdatedBy,
        updatedAt: now,
      })
      .where(eq(cars.id, carId))
      .returning();
    return updated;
  }

  // Rental operations
  async getAllRentals(): Promise<Rental[]> {
    return db.select().from(rentals).orderBy(desc(rentals.createdAt));
  }

  // Returns rentals that overlap the [from, to] date window (inclusive).
  // A rental overlaps when it starts on/before `to` and ends on/after `from`,
  // so rentals spanning the window edges are included. Either bound may be
  // omitted to leave that side open.
  async getRentalsInRange(from?: string, to?: string): Promise<Rental[]> {
    const conditions = [];
    if (to) conditions.push(lte(rentals.startDate, to));
    if (from) conditions.push(gte(rentals.endDate, from));
    if (conditions.length === 0) return this.getAllRentals();
    return db
      .select()
      .from(rentals)
      .where(and(...conditions))
      .orderBy(desc(rentals.createdAt));
  }

  async getRentalById(id: number): Promise<Rental | undefined> {
    const [rental] = await db.select().from(rentals).where(eq(rentals.id, id));
    return rental;
  }

  async createRental(rental: InsertRental): Promise<Rental> {
    const [created] = await db.insert(rentals).values(rental).returning();
    return created;
  }

  async updateRental(id: number, rental: Partial<InsertRental>): Promise<Rental | undefined> {
    const [updated] = await db
      .update(rentals)
      .set({ ...rental, updatedAt: new Date() })
      .where(eq(rentals.id, id))
      .returning();
    return updated;
  }

  async createRentalWithAvailability(rental: InsertRental): Promise<Rental> {
    validateRentalDateRange(rental.startDate, rental.endDate);

    // All availability-sensitive write paths serialize on the target car
    // before checking conflicts. True concurrency coverage requires an
    // isolated PostgreSQL database and remains part of Task 8 verification.
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM ${cars} WHERE id = ${rental.carId} FOR UPDATE`);
      const [targetCar] = await tx.select().from(cars).where(eq(cars.id, rental.carId));
      if (!targetCar) {
        throw new StorageDomainError("not_found", "CAR_NOT_FOUND", "Car not found");
      }
      if (targetCar.status === "maintenance") {
        throw new StorageDomainError(
          "conflict",
          "CAR_IN_MAINTENANCE",
          "Car is under maintenance",
        );
      }

      const existingRentals = await tx
        .select()
        .from(rentals)
        .where(eq(rentals.carId, rental.carId));
      if (
        existingRentals.some((existing) =>
          datesConflict(existing.startDate, existing.endDate, rental.startDate, rental.endDate),
        )
      ) {
        throw new StorageDomainError(
          "conflict",
          "CAR_DATE_CONFLICT",
          "Car is already booked for these dates",
        );
      }

      const [created] = await tx.insert(rentals).values(rental).returning();
      return created;
    });
  }

  async updateRentalWithAvailability(
    id: number,
    patch: Partial<InsertRental>,
  ): Promise<Rental> {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM ${rentals} WHERE id = ${id} FOR UPDATE`);
      const [existingRental] = await tx.select().from(rentals).where(eq(rentals.id, id));
      if (!existingRental) {
        throw new StorageDomainError("not_found", "RENTAL_NOT_FOUND", "Rental not found");
      }

      assertRentalCarUnchanged(existingRental.carId, patch.carId);
      const {
        carId: targetCarId,
        startDate: targetStartDate,
        endDate: targetEndDate,
        changed: availabilityChanged,
      } = resolveRentalAvailabilityTarget(existingRental, patch);

      if (availabilityChanged) {
        validateRentalDateRange(targetStartDate, targetEndDate);
        await tx.execute(sql`SELECT id FROM ${cars} WHERE id = ${targetCarId} FOR UPDATE`);
        const [targetCar] = await tx.select().from(cars).where(eq(cars.id, targetCarId));
        if (!targetCar) {
          throw new StorageDomainError("not_found", "CAR_NOT_FOUND", "Car not found");
        }
        if (targetCar.status === "maintenance") {
          throw new StorageDomainError(
            "conflict",
            "CAR_IN_MAINTENANCE",
            "Car is under maintenance",
          );
        }

        const existingRentals = await tx
          .select()
          .from(rentals)
          .where(and(eq(rentals.carId, targetCarId), ne(rentals.id, id)));
        if (
          existingRentals.some((rental) =>
            datesConflict(rental.startDate, rental.endDate, targetStartDate, targetEndDate),
          )
        ) {
          throw new StorageDomainError(
            "conflict",
            "CAR_DATE_CONFLICT",
            "Car is already booked for these dates",
          );
        }
      }

      const [updated] = await tx
        .update(rentals)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(rentals.id, id))
        .returning();
      return updated;
    });
  }

  async deleteRental(id: number): Promise<void> {
    await db.delete(rentals).where(eq(rentals.id, id));
  }

  async getRentalsNeedingFinalizeReminder(): Promise<Rental[]> {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    
    // Get non-finalized rentals where:
    // - lastFinalizeReminder is null (never asked) OR
    // - lastFinalizeReminder is older than 12 hours
    return db
      .select()
      .from(rentals)
      .where(
        and(
          eq(rentals.isFinalized, false),
          sql`(${rentals.lastFinalizeReminder} IS NULL OR ${rentals.lastFinalizeReminder} < ${twelveHoursAgo})`
        )
      )
      .orderBy(desc(rentals.createdAt));
  }

  async updateFinalizeReminder(id: number): Promise<Rental | undefined> {
    const [updated] = await db
      .update(rentals)
      .set({ lastFinalizeReminder: new Date(), updatedAt: new Date() })
      .where(eq(rentals.id, id))
      .returning();
    return updated;
  }

  async switchRentalCar({
    rentalId,
    newCarId,
    reason,
    userId,
  }: {
    rentalId: number;
    newCarId: number;
    reason: string;
    userId: string;
  }): Promise<{ rental: Rental; switchRecord: CarSwitchWithDetails }> {
    const switchReason = reason.trim();
    const switchingUserId = userId.trim();
    if (!switchReason) {
      throw new StorageDomainError(
        "validation",
        "SWITCH_REASON_REQUIRED",
        "Car switch reason is required",
      );
    }
    if (!switchingUserId) {
      throw new StorageDomainError(
        "validation",
        "SWITCH_USER_REQUIRED",
        "Car switch user is required",
      );
    }

    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM ${rentals} WHERE id = ${rentalId} FOR UPDATE`);
      const [rental] = await tx.select().from(rentals).where(eq(rentals.id, rentalId));
      if (!rental) {
        throw new StorageDomainError("not_found", "RENTAL_NOT_FOUND", "Rental not found");
      }
      if (rental.isFinalized) {
        throw new StorageDomainError(
          "conflict",
          "RENTAL_FINALIZED",
          "Finalized rentals cannot change cars",
        );
      }
      if (rental.carId === newCarId) {
        throw new StorageDomainError("conflict", "SAME_CAR", "Replacement car must be different");
      }

      // Match updateRentalWithAvailability's lock order: rental first, then
      // target car, with conflict checks only after the car lock is held.
      await tx.execute(sql`SELECT id FROM ${cars} WHERE id = ${newCarId} FOR UPDATE`);
      const [newCar] = await tx.select().from(cars).where(eq(cars.id, newCarId));
      if (!newCar) {
        throw new StorageDomainError("not_found", "CAR_NOT_FOUND", "Replacement car not found");
      }
      if (newCar.status === "maintenance") {
        throw new StorageDomainError(
          "conflict",
          "CAR_IN_MAINTENANCE",
          "Replacement car is under maintenance",
        );
      }

      const [oldCar] = await tx.select().from(cars).where(eq(cars.id, rental.carId));
      if (!oldCar) {
        throw new StorageDomainError(
          "not_found",
          "OLD_CAR_NOT_FOUND",
          "Rental's current car was not found",
        );
      }
      const [user] = await tx
        .select(safeUserSelection)
        .from(users)
        .where(eq(users.id, switchingUserId));
      if (!user) {
        throw new StorageDomainError("not_found", "USER_NOT_FOUND", "Switching user not found");
      }

      const possibleConflicts = await tx
        .select()
        .from(rentals)
        .where(and(eq(rentals.carId, newCarId), ne(rentals.id, rentalId)));
      if (
        possibleConflicts.some((existing) =>
          datesConflict(existing.startDate, existing.endDate, rental.startDate, rental.endDate),
        )
      ) {
        throw new StorageDomainError(
          "conflict",
          "CAR_DATE_CONFLICT",
          "Replacement car is already booked for these dates",
        );
      }

      const now = new Date();
      const [updatedRental] = await tx
        .update(rentals)
        .set({ carId: newCarId, updatedAt: now })
        .where(eq(rentals.id, rentalId))
        .returning();
      const [createdSwitch] = await tx
        .insert(carSwitches)
        .values({
          rentalId,
          oldCarId: oldCar.id,
          newCarId: newCar.id,
          reason: switchReason,
          userId: switchingUserId,
        })
        .returning();

      await tx.insert(activityLogs).values({
        userId: switchingUserId,
        entityType: "rental_car_switch",
        entityId: String(rentalId),
        action: "updated",
        beforeData: {
          rental,
          oldCar,
          reason: switchReason,
          price: rental.totalAmount,
          paymentStatus: rental.paymentStatus,
          reservationStatus: rental.reservationStatus,
        },
        afterData: {
          rental: updatedRental,
          newCar,
          reason: switchReason,
          price: updatedRental.totalAmount,
          paymentStatus: updatedRental.paymentStatus,
          reservationStatus: updatedRental.reservationStatus,
        },
      });

      const [reloadedOldCar] = await tx.select().from(cars).where(eq(cars.id, oldCar.id));
      const [reloadedNewCar] = await tx.select().from(cars).where(eq(cars.id, newCar.id));
      const [reloadedUser] = await tx
        .select(safeUserSelection)
        .from(users)
        .where(eq(users.id, switchingUserId));
      if (!reloadedOldCar || !reloadedNewCar || !reloadedUser) {
        throw new StorageDomainError(
          "invariant",
          "CAR_SWITCH_DETAILS_RELOAD_FAILED",
          "Failed to reload car switch details",
        );
      }

      return {
        rental: updatedRental,
        switchRecord: {
          ...createdSwitch,
          rental: updatedRental,
          oldCar: reloadedOldCar,
          newCar: reloadedNewCar,
          user: toSafeUser(reloadedUser),
        },
      };
    });
  }

  async getCarSwitchesByRentalId(rentalId: number): Promise<CarSwitchWithDetails[]> {
    const switches = await db
      .select()
      .from(carSwitches)
      .where(eq(carSwitches.rentalId, rentalId))
      .orderBy(desc(carSwitches.switchedAt));
    if (switches.length === 0) return [];

    const rentalIds = Array.from(new Set(switches.map((record) => record.rentalId)));
    const carIds = Array.from(
      new Set(switches.flatMap((record) => [record.oldCarId, record.newCarId])),
    );
    const userIds = Array.from(new Set(switches.map((record) => record.userId)));
    const [relatedRentals, relatedCars, relatedUsers] = await Promise.all([
      db.select().from(rentals).where(inArray(rentals.id, rentalIds)),
      db.select().from(cars).where(inArray(cars.id, carIds)),
      db.select(safeUserSelection).from(users).where(inArray(users.id, userIds)),
    ]);
    const rentalsById = new Map(relatedRentals.map((rental) => [rental.id, rental]));
    const carsById = new Map(relatedCars.map((car) => [car.id, car]));
    const usersById = new Map(relatedUsers.map((user) => [user.id, user]));

    return switches.map((record) => {
      const rental = rentalsById.get(record.rentalId);
      const oldCar = carsById.get(record.oldCarId);
      const newCar = carsById.get(record.newCarId);
      const user = usersById.get(record.userId);
      if (!rental || !oldCar || !newCar || !user) {
        throw new StorageDomainError(
          "invariant",
          "CAR_SWITCH_DETAILS_MISSING",
          `Related details are missing for car switch ${record.id}`,
        );
      }
      return { ...record, rental, oldCar, newCar, user: toSafeUser(user) };
    });
  }

  async hasCarSwitchesForRental(rentalId: number): Promise<boolean> {
    const [record] = await db
      .select({ id: carSwitches.id })
      .from(carSwitches)
      .where(eq(carSwitches.rentalId, rentalId))
      .limit(1);
    return Boolean(record);
  }

  // Expense operations
  async getAllExpenses(): Promise<Expense[]> {
    return db.select().from(expenses).orderBy(desc(expenses.createdAt));
  }

  async getExpensesByCarId(carId: number): Promise<Expense[]> {
    return db
      .select()
      .from(expenses)
      .where(eq(expenses.carId, carId))
      .orderBy(desc(expenses.expenseDate));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [created] = await db.insert(expenses).values(expense).returning();
    return created;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  // Monthly payment operations
  async getMonthlyPayments(month: number, year: number): Promise<MonthlyPayment[]> {
    return db
      .select()
      .from(monthlyPayments)
      .where(and(eq(monthlyPayments.month, month), eq(monthlyPayments.year, year)));
  }

  async createOrUpdateMonthlyPayment(payment: InsertMonthlyPayment): Promise<MonthlyPayment> {
    const existing = await db
      .select()
      .from(monthlyPayments)
      .where(
        and(
          eq(monthlyPayments.carId, payment.carId!),
          eq(monthlyPayments.month, payment.month!),
          eq(monthlyPayments.year, payment.year!)
        )
      );

    if (existing.length > 0) {
      const [updated] = await db
        .update(monthlyPayments)
        .set(payment)
        .where(eq(monthlyPayments.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(monthlyPayments).values(payment).returning();
    return created;
  }

  // Edit log operations
  async getAllEditLogs(): Promise<EditLogWithDetails[]> {
    const logs = await db
      .select()
      .from(editLogs)
      .orderBy(desc(editLogs.editedAt));
    
    const logsWithDetails: EditLogWithDetails[] = [];
    for (const log of logs) {
      const [car] = await db.select().from(cars).where(eq(cars.id, log.carId));
      const [user] = await db.select().from(users).where(eq(users.id, log.userId));
      if (car && user) {
        logsWithDetails.push({ ...log, car, user });
      }
    }
    return logsWithDetails;
  }

  async getEditLogsByCarId(carId: number): Promise<EditLogWithDetails[]> {
    const logs = await db
      .select()
      .from(editLogs)
      .where(eq(editLogs.carId, carId))
      .orderBy(desc(editLogs.editedAt));
    
    const logsWithDetails: EditLogWithDetails[] = [];
    for (const log of logs) {
      const [car] = await db.select().from(cars).where(eq(cars.id, log.carId));
      const [user] = await db.select().from(users).where(eq(users.id, log.userId));
      if (car && user) {
        logsWithDetails.push({ ...log, car, user });
      }
    }
    return logsWithDetails;
  }

  async createEditLog(log: InsertEditLog): Promise<EditLog> {
    const [created] = await db.insert(editLogs).values(log).returning();
    return created;
  }

  // Rental log operations
  async getAllRentalLogs(): Promise<RentalLogWithUser[]> {
    const logs = await db
      .select()
      .from(rentalLogs)
      .orderBy(desc(rentalLogs.loggedAt));
    
    const logsWithUser: RentalLogWithUser[] = [];
    for (const log of logs) {
      const [user] = await db.select().from(users).where(eq(users.id, log.userId));
      if (user) {
        logsWithUser.push({ ...log, user });
      }
    }
    return logsWithUser;
  }

  async createRentalLog(log: InsertRentalLog): Promise<RentalLog> {
    const [created] = await db.insert(rentalLogs).values(log).returning();
    return created;
  }

  // Expense log operations
  async getAllExpenseLogs(): Promise<ExpenseLogWithUser[]> {
    const logs = await db
      .select()
      .from(expenseLogs)
      .orderBy(desc(expenseLogs.loggedAt));

    const logsWithUser: ExpenseLogWithUser[] = [];
    for (const log of logs) {
      const [user] = await db.select().from(users).where(eq(users.id, log.userId));
      if (user) {
        logsWithUser.push({ ...log, user });
      }
    }
    return logsWithUser;
  }

  async getExpenseLogsByCarId(carId: number): Promise<ExpenseLogWithUser[]> {
    const logs = await db
      .select()
      .from(expenseLogs)
      .where(eq(expenseLogs.carId, carId))
      .orderBy(desc(expenseLogs.loggedAt));

    const logsWithUser: ExpenseLogWithUser[] = [];
    for (const log of logs) {
      const [user] = await db.select().from(users).where(eq(users.id, log.userId));
      if (user) {
        logsWithUser.push({ ...log, user });
      }
    }
    return logsWithUser;
  }

  async createExpenseLog(log: InsertExpenseLog): Promise<ExpenseLog> {
    const [created] = await db.insert(expenseLogs).values(log).returning();
    return created;
  }

  async getAllActivityLogs(): Promise<ActivityLogWithUser[]> {
    const rows = await db
      .select({ log: activityLogs, user: users })
      .from(activityLogs)
      .innerJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.loggedAt));
    return rows.map(({ log, user }) => ({ ...log, user }));
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [created] = await db.insert(activityLogs).values(log).returning();
    return created;
  }

  async getExpenseById(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }

  async updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updated] = await db
      .update(expenses)
      .set(expense)
      .where(eq(expenses.id, id))
      .returning();
    return updated;
  }

  // Stats
  async getStats(): Promise<{
    totalUsers: number;
    totalCars: number;
    totalRentals: number;
    activeRentals: number;
    totalCustomers: number;
  }> {
    const allUsers = await db.select().from(users);
    const allCars = await db.select().from(cars);
    const allRentals = await db.select().from(rentals);
    const allCustomers = await db.select().from(customers);
    const activeRentalsList = allRentals.filter((r) => !r.isFinalized);

    return {
      totalUsers: allUsers.length,
      totalCars: allCars.length,
      totalRentals: allRentals.length,
      activeRentals: activeRentalsList.length,
      totalCustomers: allCustomers.length,
    };
  }

  // Dashboard stats are computed entirely in SQL so the cost stays constant
  // as the rental history grows. See `DashboardStats` in shared/schema.ts for
  // the precise definition of each field (especially the pro-rated month
  // income, which fixes the double-counting in the old client computation).
  async getDashboardStats(): Promise<DashboardStats> {
    const result = await db.execute(sql`
      WITH bounds AS (
        SELECT
          CURRENT_DATE AS today,
          date_trunc('month', CURRENT_DATE)::date AS month_start,
          (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date AS month_end,
          (date_trunc('month', CURRENT_DATE) - interval '1 month')::date AS last_month_start,
          (date_trunc('month', CURRENT_DATE) - interval '1 day')::date AS last_month_end,
          date_trunc('year', CURRENT_DATE)::date AS year_start
      )
      SELECT
        (
          SELECT COUNT(DISTINCT r.car_id)::int
          FROM rentals r, bounds b
          WHERE r.start_date <= b.today AND r.end_date >= b.today
        ) AS active_rentals,
        (
          SELECT COALESCE(SUM(r.total_amount), 0)::float8
          FROM rentals r, bounds b
          WHERE r.start_date = b.today AND r.payment_status = 'confirmed'
        ) AS today_income,
        (
          SELECT COALESCE(SUM(
            -- Pro-rate by overlap days using a self-consistent inclusive-day
            -- count for both numerator and denominator. We deliberately do
            -- NOT divide by the stored days_rented column because that uses
            -- exclusive-end semantics (Jan 1 -> Jan 2 stores 1), which would
            -- make a same-day rental contribute 0 and a one-night rental
            -- contribute 2x its total. Using (end - start + 1) for both keeps
            -- the per-rental sum across periods equal to total_amount exactly.
            (LEAST(r.end_date, b.month_end) - GREATEST(r.start_date, b.month_start) + 1)::float8
            / GREATEST(r.end_date - r.start_date + 1, 1)::float8
            * r.total_amount::float8
          ), 0)::float8
          FROM rentals r, bounds b
          WHERE r.start_date <= b.month_end AND r.end_date >= b.month_start
            AND r.payment_status = 'confirmed'
        ) AS month_income,
        (
          -- Same pro-rated overlap formula as month_income, over the
          -- previous calendar month.
          SELECT COALESCE(SUM(
            (LEAST(r.end_date, b.last_month_end) - GREATEST(r.start_date, b.last_month_start) + 1)::float8
            / GREATEST(r.end_date - r.start_date + 1, 1)::float8
            * r.total_amount::float8
          ), 0)::float8
          FROM rentals r, bounds b
          WHERE r.start_date <= b.last_month_end AND r.end_date >= b.last_month_start
            AND r.payment_status = 'confirmed'
        ) AS last_month_income,
        (
          -- Same pro-rated overlap formula, over Jan 1 through today
          -- (inclusive) of the current year.
          SELECT COALESCE(SUM(
            (LEAST(r.end_date, b.today) - GREATEST(r.start_date, b.year_start) + 1)::float8
            / GREATEST(r.end_date - r.start_date + 1, 1)::float8
            * r.total_amount::float8
          ), 0)::float8
          FROM rentals r, bounds b
          WHERE r.start_date <= b.today AND r.end_date >= b.year_start
            AND r.payment_status = 'confirmed'
        ) AS year_to_date_income,
        (SELECT COUNT(*)::int FROM cars) AS total_cars
    `);

    const row = (result.rows?.[0] ?? {}) as Record<string, unknown>;
    const totalCars = Number(row.total_cars) || 0;
    const activeRentals = Number(row.active_rentals) || 0;
    return {
      activeRentals,
      todayIncome: Number(row.today_income) || 0,
      monthIncome: Number(row.month_income) || 0,
      lastMonthIncome: Number(row.last_month_income) || 0,
      yearToDateIncome: Number(row.year_to_date_income) || 0,
      availableCars: Math.max(0, totalCars - activeRentals),
      totalCars,
    };
  }

  // Counted over every rental, not just the dashboard's timeline window —
  // the oldest cars still out are the ones most worth chasing, and they sit
  // outside the 60 days the client fetches.
  async getDashboardExceptions(): Promise<DashboardExceptions> {
    const result = await db.execute(sql`
      SELECT
        (
          SELECT COUNT(*)::int FROM rentals
          WHERE end_date < CURRENT_DATE AND is_finalized = false
        ) AS overdue_count,
        (
          SELECT COUNT(*)::int FROM rentals
          WHERE end_date = CURRENT_DATE AND is_finalized = false
        ) AS due_today_count,
        (
          SELECT COUNT(*)::int FROM rentals
          WHERE start_date = CURRENT_DATE
        ) AS pickups_today_count,
        (
          SELECT COUNT(*)::int FROM rentals
          WHERE payment_status = 'pending'
        ) AS unpaid_count,
        (
          SELECT COALESCE(SUM(total_amount), 0)::float8 FROM rentals
          WHERE payment_status = 'pending'
        ) AS unpaid_amount
    `);

    const row = (result.rows?.[0] ?? {}) as Record<string, unknown>;
    return {
      overdueCount: Number(row.overdue_count) || 0,
      dueTodayCount: Number(row.due_today_count) || 0,
      pickupsTodayCount: Number(row.pickups_today_count) || 0,
      unpaidCount: Number(row.unpaid_count) || 0,
      unpaidAmount: Number(row.unpaid_amount) || 0,
    };
  }

  // Pro-rated income per calendar month for the last 12 months (including
  // the current month), computed in SQL with the same inclusive-day overlap
  // formula as getDashboardStats above. See `MonthlyIncomePoint` in
  // shared/schema.ts for the precise definition. Months with no income are
  // returned as zeros so the chart always has 12 evenly spaced points.
  async getMonthlyIncomeTrend(): Promise<MonthlyIncomePoint[]> {
    const result = await db.execute(sql`
      WITH months AS (
        SELECT
          m::date AS month_start,
          (m + interval '1 month - 1 day')::date AS month_end
        FROM generate_series(
          date_trunc('month', CURRENT_DATE) - interval '11 months',
          date_trunc('month', CURRENT_DATE),
          interval '1 month'
        ) AS m
      )
      SELECT
        to_char(months.month_start, 'YYYY-MM-DD') AS month,
        COALESCE(SUM(
          -- Same self-consistent inclusive-day pro-rating as
          -- getDashboardStats: (end - start + 1) in both numerator and
          -- denominator so per-rental sums across months equal total_amount.
          (LEAST(r.end_date, months.month_end) - GREATEST(r.start_date, months.month_start) + 1)::float8
          / GREATEST(r.end_date - r.start_date + 1, 1)::float8
          * r.total_amount::float8
        ), 0)::float8 AS income
      FROM months
      LEFT JOIN rentals r
        ON r.start_date <= months.month_end
       AND r.end_date >= months.month_start
       AND r.payment_status = 'confirmed'
      GROUP BY months.month_start
      ORDER BY months.month_start
    `);

    return (result.rows ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        month: String(r.month),
        income: Number(r.income) || 0,
      };
    });
  }
}

export const storage = new DatabaseStorage();
