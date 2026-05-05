import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table with username/password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).unique(),
  password: varchar("password", { length: 255 }),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  idNumber: varchar("id_number", { length: 100 }), // driver's license or ID
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cars table
export const cars = pgTable("cars", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 100 }), // Toyota, Suzuki, Isuzu, etc.
  model: varchar("model", { length: 255 }).notNull(),
  plateNumber: varchar("plate_number", { length: 50 }).notNull().unique(),
  color: varchar("color", { length: 50 }).notNull(),
  colorCode: varchar("color_code", { length: 7 }).notNull(), // hex color for calendar
  monthlyPayment: decimal("monthly_payment", { precision: 10, scale: 2 }).notNull(),
  lastOilChangeMileage: integer("last_oil_change_mileage").default(0),
  currentMileage: integer("current_mileage").default(0),
  oilChangeIntervalKm: integer("oil_change_interval_km").default(5000),
  // Time-based oil change threshold so cars that sit idle still get flagged.
  // Defaults to 180 days (~6 months) and is checked against `lastMaintenanceDate`.
  oilChangeIntervalDays: integer("oil_change_interval_days").notNull().default(180),
  lastMaintenanceDate: date("last_maintenance_date"),
  status: varchar("status", { length: 20 }).default("available").notNull(), // available, rented, maintenance
  dateAcquired: date("date_acquired"),
  registrationConfirmedAt: date("registration_confirmed_at"),
  imageUrl: varchar("image_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rentals table
export const rentals = pgTable("rentals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  carId: integer("car_id").notNull().references(() => cars.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  daysRented: integer("days_rented").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentScreenshotUrl: varchar("payment_screenshot_url", { length: 500 }),
  paymentStatus: varchar("payment_status", { length: 20 }).default("confirmed").notNull(), // pending, confirmed
  paymentDate: date("payment_date"), // date the payment was received (required when paymentStatus=confirmed)
  paymentBank: varchar("payment_bank", { length: 100 }), // bank/e-wallet the payment was sent to (required when paymentStatus=confirmed)
  isFinalized: boolean("is_finalized").default(false).notNull(),
  lastFinalizeReminder: timestamp("last_finalize_reminder"), // tracks when we last asked about finalization
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  carId: integer("car_id").notNull().references(() => cars.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  category: varchar("category", { length: 100 }).notNull(), // fuel, maintenance, repair, insurance, etc.
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  mileageAtExpense: integer("mileage_at_expense"),
  expenseDate: date("expense_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Monthly payments tracking
export const monthlyPayments = pgTable("monthly_payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  carId: integer("car_id").notNull().references(() => cars.id, { onDelete: "cascade" }),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  amountDue: decimal("amount_due", { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default("0"),
  isPaid: boolean("is_paid").default(false).notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Edit logs table for tracking car edits
export const editLogs = pgTable("edit_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  carId: integer("car_id").notNull().references(() => cars.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  editedAt: timestamp("edited_at").defaultNow().notNull(),
});

// Expense logs table for tracking expense create, update, delete
export const expenseLogs = pgTable("expense_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  expenseId: integer("expense_id"), // nullable because expense may be deleted
  carId: integer("car_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(), // created, updated, deleted
  fieldName: varchar("field_name", { length: 100 }), // for updates: which field changed
  oldValue: text("old_value"),
  newValue: text("new_value"),
  // Snapshot of expense details for context
  category: varchar("category", { length: 100 }),
  description: text("description"),
  amount: varchar("amount", { length: 50 }),
  expenseDate: varchar("expense_date", { length: 20 }),
  mileageAtExpense: varchar("mileage_at_expense", { length: 50 }),
  carName: varchar("car_name", { length: 255 }),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
});

// Rental logs table for tracking rental changes (create, update, delete)
export const rentalLogs = pgTable("rental_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  rentalId: integer("rental_id"), // nullable because rental may be deleted
  carId: integer("car_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(), // created, updated, deleted
  fieldName: varchar("field_name", { length: 100 }), // for updates: which field changed
  oldValue: text("old_value"),
  newValue: text("new_value"),
  // Store rental details for context
  customerName: varchar("customer_name", { length: 255 }),
  startDate: varchar("start_date", { length: 20 }),
  endDate: varchar("end_date", { length: 20 }),
  totalAmount: varchar("total_amount", { length: 50 }),
  carName: varchar("car_name", { length: 255 }),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  rentals: many(rentals),
  expenses: many(expenses),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  rentals: many(rentals),
}));

export const carsRelations = relations(cars, ({ many }) => ({
  rentals: many(rentals),
  expenses: many(expenses),
  monthlyPayments: many(monthlyPayments),
}));

export const rentalsRelations = relations(rentals, ({ one }) => ({
  car: one(cars, {
    fields: [rentals.carId],
    references: [cars.id],
  }),
  user: one(users, {
    fields: [rentals.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [rentals.customerId],
    references: [customers.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  car: one(cars, {
    fields: [expenses.carId],
    references: [cars.id],
  }),
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
}));

export const monthlyPaymentsRelations = relations(monthlyPayments, ({ one }) => ({
  car: one(cars, {
    fields: [monthlyPayments.carId],
    references: [cars.id],
  }),
}));

export const editLogsRelations = relations(editLogs, ({ one }) => ({
  car: one(cars, {
    fields: [editLogs.carId],
    references: [cars.id],
  }),
  user: one(users, {
    fields: [editLogs.userId],
    references: [users.id],
  }),
}));

export const rentalLogsRelations = relations(rentalLogs, ({ one }) => ({
  user: one(users, {
    fields: [rentalLogs.userId],
    references: [users.id],
  }),
}));

export const expenseLogsRelations = relations(expenseLogs, ({ one }) => ({
  user: one(users, {
    fields: [expenseLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCarSchema = createInsertSchema(cars).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRentalSchema = createInsertSchema(rentals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export const insertMonthlyPaymentSchema = createInsertSchema(monthlyPayments).omit({
  id: true,
  createdAt: true,
});

export const insertEditLogSchema = createInsertSchema(editLogs).omit({
  id: true,
  editedAt: true,
});

export const insertRentalLogSchema = createInsertSchema(rentalLogs).omit({
  id: true,
  loggedAt: true,
});

export const insertExpenseLogSchema = createInsertSchema(expenseLogs).omit({
  id: true,
  loggedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Car = typeof cars.$inferSelect;
export type InsertCar = z.infer<typeof insertCarSchema>;

export type Rental = typeof rentals.$inferSelect;
export type InsertRental = z.infer<typeof insertRentalSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type MonthlyPayment = typeof monthlyPayments.$inferSelect;
export type InsertMonthlyPayment = z.infer<typeof insertMonthlyPaymentSchema>;

export type EditLog = typeof editLogs.$inferSelect;
export type InsertEditLog = z.infer<typeof insertEditLogSchema>;

export type RentalLog = typeof rentalLogs.$inferSelect;
export type InsertRentalLog = z.infer<typeof insertRentalLogSchema>;

export type ExpenseLog = typeof expenseLogs.$inferSelect;
export type InsertExpenseLog = z.infer<typeof insertExpenseLogSchema>;

// Dashboard stats payload returned by GET /api/dashboard/stats.
//
// Income definitions:
// - `todayIncome`: sum of `totalAmount` for rentals whose `startDate` is today.
//   Mirrors the historical UI semantics of "income booked today".
// - `monthIncome`: sum of each rental's `totalAmount` pro-rated by overlap
//   days. Overlap days and the rental's full duration are both counted
//   inclusively (start through end), so a 5-day rental whose first 2 days
//   fall in the month contributes 2/5 of its total, and a same-day rental
//   inside the month contributes its full total. Per-rental contributions
//   across all periods sum to exactly `totalAmount`. This avoids the
//   double-counting that the previous client-side approximation produced
//   for rentals spanning month boundaries.
// - `activeRentals`: distinct cars currently rented (today within range).
// - `availableCars`: `totalCars - activeRentals`, clamped at zero.
export type DashboardStats = {
  activeRentals: number;
  todayIncome: number;
  monthIncome: number;
  availableCars: number;
  totalCars: number;
};

// Extended types with relations
export type RentalWithCar = Rental & { car: Car };
export type ExpenseWithCar = Expense & { car: Car };
export type CustomerWithRentals = Customer & { rentals: RentalWithCar[] };
export type EditLogWithDetails = EditLog & { car: Car; user: User };
export type RentalLogWithUser = RentalLog & { user: User };
export type ExpenseLogWithUser = ExpenseLog & { user: User };
