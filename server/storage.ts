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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(userData: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  toggleUserAdmin(id: string): Promise<User | undefined>;
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
  getRentalsNeedingFinalizeReminder(): Promise<Rental[]>;
  updateFinalizeReminder(id: number): Promise<Rental | undefined>;

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
      .set({ isAdmin: !user.isAdmin, updatedAt: new Date() })
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
}

export const storage = new DatabaseStorage();
