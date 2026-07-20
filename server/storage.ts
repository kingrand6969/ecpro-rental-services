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
  type DashboardStats,
  type MonthlyIncomePoint,
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
  getRentalsInRange(from?: string, to?: string): Promise<Rental[]>;
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
  getDashboardStats(): Promise<DashboardStats>;
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
