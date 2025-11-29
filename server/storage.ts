import {
  users,
  cars,
  rentals,
  expenses,
  monthlyPayments,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  toggleUserAdmin(id: string): Promise<User | undefined>;

  // Car operations
  getAllCars(): Promise<Car[]>;
  getCarById(id: number): Promise<Car | undefined>;
  createCar(car: InsertCar): Promise<Car>;
  updateCar(id: number, car: Partial<InsertCar>): Promise<Car | undefined>;
  deleteCar(id: number): Promise<void>;
  recordOilChange(id: number): Promise<Car | undefined>;

  // Rental operations
  getAllRentals(): Promise<Rental[]>;
  getRentalById(id: number): Promise<Rental | undefined>;
  createRental(rental: InsertRental): Promise<Rental>;
  updateRental(id: number, rental: Partial<InsertRental>): Promise<Rental | undefined>;
  deleteRental(id: number): Promise<void>;

  // Expense operations
  getAllExpenses(): Promise<Expense[]>;
  getExpensesByCarId(carId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;

  // Monthly payment operations
  getMonthlyPayments(month: number, year: number): Promise<MonthlyPayment[]>;
  createOrUpdateMonthlyPayment(payment: InsertMonthlyPayment): Promise<MonthlyPayment>;

  // Stats
  getStats(): Promise<{
    totalUsers: number;
    totalCars: number;
    totalRentals: number;
    activeRentals: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
      .set({ isAdmin: !user.isAdmin, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  // Car operations
  async getAllCars(): Promise<Car[]> {
    return db.select().from(cars).orderBy(desc(cars.createdAt));
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

  async recordOilChange(id: number): Promise<Car | undefined> {
    const car = await this.getCarById(id);
    if (!car) return undefined;

    const [updated] = await db
      .update(cars)
      .set({
        lastOilChangeMileage: car.currentMileage,
        lastMaintenanceDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date(),
      })
      .where(eq(cars.id, id))
      .returning();
    return updated;
  }

  // Rental operations
  async getAllRentals(): Promise<Rental[]> {
    return db.select().from(rentals).orderBy(desc(rentals.createdAt));
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

  async deleteRental(id: number): Promise<void> {
    await db.delete(rentals).where(eq(rentals.id, id));
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

  // Stats
  async getStats(): Promise<{
    totalUsers: number;
    totalCars: number;
    totalRentals: number;
    activeRentals: number;
  }> {
    const allUsers = await db.select().from(users);
    const allCars = await db.select().from(cars);
    const allRentals = await db.select().from(rentals);
    const activeRentalsList = allRentals.filter((r) => !r.isFinalized);

    return {
      totalUsers: allUsers.length,
      totalCars: allCars.length,
      totalRentals: allRentals.length,
      activeRentals: activeRentalsList.length,
    };
  }
}

export const storage = new DatabaseStorage();
