# Maintenance, Availability, and Car-Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add maintenance blocking, date-based fleet availability, and an audited same-price rental car-switch workflow.

**Architecture:** A shared server-side availability service is the single source of truth for searches, rental creation, rental edits, and car switching. Maintenance state remains on each car, while every switch is preserved in a dedicated history table and the unified activity log; focused React pages and dialogs consume these APIs through React Query.

**Tech Stack:** React 18, TypeScript, Wouter, TanStack Query, Tailwind/shadcn UI, Express, Drizzle ORM, PostgreSQL/Neon, Zod, Node test runner through `tsx --test`.

---

## File Structure

**Create**

- `server/availability.ts` — pure date-range validation and availability classification.
- `server/availability.test.ts` — unit coverage for overlap and maintenance rules.
- `client/src/pages/Availability.tsx` — dedicated responsive availability search page.
- `client/src/components/MaintenanceStatusDialog.tsx` — maintenance reason and release confirmation.
- `client/src/components/SwitchCarDialog.tsx` — replacement selection and same-price confirmation.

**Modify**

- `shared/schema.ts` — maintenance metadata, `carSwitches` table, relations, insert schemas, and shared API types.
- `server/storage.ts` — availability queries, affected rentals, maintenance updates, atomic switch transaction, and history reads.
- `server/routes.ts` — availability, maintenance, affected-rental, switch, and switch-history endpoints.
- `client/src/App.tsx` — `/availability` route.
- `client/src/components/AppSidebar.tsx` — Availability navigation item.
- `client/src/components/CreateRentalDialog.tsx` — accept preselected car and dates.
- `client/src/components/CarDetailsDialog.tsx` — maintenance state, affected rentals, and switch actions.
- `client/src/components/RentalDetailsDialog.tsx` — car-switch history display.
- `client/src/pages/Cars.tsx` — refresh and display maintenance state consistently.
- `client/src/pages/Logs.tsx` — readable maintenance and car-switch audit entries.
- `package.json` — deterministic test command.

## Task 1: Shared Schema and API Contracts

**Files:**
- Modify: `shared/schema.ts`
- Test: `shared/schema.ts` through `npm.cmd run check`

- [ ] **Step 1: Add maintenance metadata to cars**

Add these columns after `status`:

```ts
maintenanceReason: text("maintenance_reason"),
maintenanceUpdatedAt: timestamp("maintenance_updated_at"),
maintenanceUpdatedBy: varchar("maintenance_updated_by").references(() => users.id, {
  onDelete: "set null",
}),
```

- [ ] **Step 2: Add the car-switch history table**

Add after `rentals`:

```ts
export const carSwitches = pgTable("car_switches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  rentalId: integer("rental_id").notNull().references(() => rentals.id, {
    onDelete: "cascade",
  }),
  oldCarId: integer("old_car_id").notNull().references(() => cars.id, {
    onDelete: "restrict",
  }),
  newCarId: integer("new_car_id").notNull().references(() => cars.id, {
    onDelete: "restrict",
  }),
  reason: text("reason").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  switchedAt: timestamp("switched_at").defaultNow().notNull(),
});
```

- [ ] **Step 3: Add relations and insert types**

```ts
export const carSwitchesRelations = relations(carSwitches, ({ one }) => ({
  rental: one(rentals, {
    fields: [carSwitches.rentalId],
    references: [rentals.id],
  }),
  oldCar: one(cars, {
    fields: [carSwitches.oldCarId],
    references: [cars.id],
    relationName: "oldCar",
  }),
  newCar: one(cars, {
    fields: [carSwitches.newCarId],
    references: [cars.id],
    relationName: "newCar",
  }),
  user: one(users, {
    fields: [carSwitches.userId],
    references: [users.id],
  }),
}));

export const insertCarSwitchSchema = createInsertSchema(carSwitches).omit({
  switchedAt: true,
});

export type CarSwitch = typeof carSwitches.$inferSelect;
export type InsertCarSwitch = z.infer<typeof insertCarSwitchSchema>;
export type CarSwitchWithDetails = CarSwitch & {
  oldCar: Car;
  newCar: Car;
  user: User;
};
```

- [ ] **Step 4: Add shared availability response types**

```ts
export type AvailabilityReason = "available" | "booked" | "maintenance";

export type AvailabilityCar = Car & {
  availability: AvailabilityReason;
  conflictingRental?: Pick<
    Rental,
    "id" | "customerName" | "startDate" | "endDate"
  >;
};

export type AvailabilityResponse = {
  startDate: string;
  endDate: string;
  available: AvailabilityCar[];
  booked: AvailabilityCar[];
  maintenance: AvailabilityCar[];
};
```

- [ ] **Step 5: Verify schema types**

Run: `npm.cmd run check`  
Expected: TypeScript exits successfully.

- [ ] **Step 6: Commit schema**

```powershell
git add shared/schema.ts
git commit -m "Add maintenance and car switch schema"
```

## Task 2: Central Availability Rules

**Files:**
- Create: `server/availability.ts`
- Create: `server/availability.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add the test command**

Add to `scripts`:

```json
"test": "tsx --test server/*.test.ts"
```

- [ ] **Step 2: Write failing availability tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { classifyCarAvailability, validateDateRange } from "./availability";
import type { Car, Rental } from "@shared/schema";

const car = { id: 1, status: "available" } as Car;
const rental = {
  id: 10,
  carId: 1,
  customerName: "Customer",
  startDate: "2026-08-12",
  endDate: "2026-08-15",
} as Rental;

test("maintenance car is unavailable", () => {
  assert.equal(
    classifyCarAvailability(
      { ...car, status: "maintenance" },
      [],
      "2026-08-12",
      "2026-08-15",
    ).availability,
    "maintenance",
  );
});

test("overlapping rental makes car booked", () => {
  assert.equal(
    classifyCarAvailability(car, [rental], "2026-08-13", "2026-08-14")
      .availability,
    "booked",
  );
});

test("same-day handover remains available", () => {
  assert.equal(
    classifyCarAvailability(car, [rental], "2026-08-15", "2026-08-18")
      .availability,
    "available",
  );
});

test("two same-day rentals conflict", () => {
  const sameDay = { ...rental, startDate: "2026-08-15", endDate: "2026-08-15" };
  assert.equal(
    classifyCarAvailability(car, [sameDay], "2026-08-15", "2026-08-15")
      .availability,
    "booked",
  );
});

test("end before start is rejected", () => {
  assert.throws(
    () => validateDateRange("2026-08-16", "2026-08-15"),
    /end date cannot be before/i,
  );
});
```

- [ ] **Step 3: Run tests and verify failure**

Run: `npm.cmd test`  
Expected: FAIL because `server/availability.ts` does not exist.

- [ ] **Step 4: Implement pure availability helpers**

```ts
import type {
  AvailabilityCar,
  Car,
  Rental,
} from "@shared/schema";

export function validateDateRange(startDate: string, endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error("Start and end dates must use YYYY-MM-DD");
  }
  if (endDate < startDate) {
    throw new Error("Rental end date cannot be before the start date");
  }
}

export function datesConflict(
  existingStart: string,
  existingEnd: string,
  requestedStart: string,
  requestedEnd: string,
) {
  const standardOverlap =
    requestedStart < existingEnd && requestedEnd > existingStart;
  const requestedSameDay = requestedStart === requestedEnd;
  const existingSameDay = existingStart === existingEnd;
  return (
    standardOverlap ||
    (requestedSameDay &&
      requestedStart >= existingStart &&
      requestedStart < existingEnd) ||
    (existingSameDay &&
      existingStart >= requestedStart &&
      existingStart < requestedEnd) ||
    (requestedSameDay &&
      existingSameDay &&
      requestedStart === existingStart)
  );
}

export function classifyCarAvailability(
  car: Car,
  rentals: Rental[],
  startDate: string,
  endDate: string,
  excludeRentalId?: number,
): AvailabilityCar {
  validateDateRange(startDate, endDate);
  if (car.status === "maintenance") {
    return { ...car, availability: "maintenance" };
  }
  const conflict = rentals.find(
    (rental) =>
      rental.carId === car.id &&
      rental.id !== excludeRentalId &&
      datesConflict(rental.startDate, rental.endDate, startDate, endDate),
  );
  if (!conflict) return { ...car, availability: "available" };
  return {
    ...car,
    availability: "booked",
    conflictingRental: {
      id: conflict.id,
      customerName: conflict.customerName,
      startDate: conflict.startDate,
      endDate: conflict.endDate,
    },
  };
}
```

- [ ] **Step 5: Run tests and type checking**

Run: `npm.cmd test; npm.cmd run check`  
Expected: All tests pass and TypeScript exits successfully.

- [ ] **Step 6: Commit availability rules**

```powershell
git add package.json server/availability.ts server/availability.test.ts
git commit -m "Centralize fleet availability rules"
```

## Task 3: Storage Operations and Atomic Car Switching

**Files:**
- Modify: `server/storage.ts`
- Test: `server/availability.test.ts`

- [ ] **Step 1: Import switch entities and transaction helpers**

Add `carSwitches`, `InsertCarSwitch`, `CarSwitchWithDetails`, and `AvailabilityResponse` from `@shared/schema`; add `ne` to the Drizzle imports.

- [ ] **Step 2: Extend the storage interface**

```ts
getAvailability(startDate: string, endDate: string, excludeRentalId?: number): Promise<AvailabilityResponse>;
getAffectedRentals(carId: number): Promise<Rental[]>;
setCarMaintenance(carId: number, reason: string, userId: string): Promise<Car | undefined>;
clearCarMaintenance(carId: number, userId: string): Promise<Car | undefined>;
switchRentalCar(input: {
  rentalId: number;
  newCarId: number;
  reason: string;
  userId: string;
}): Promise<{ rental: Rental; switchRecord: CarSwitchWithDetails }>;
getCarSwitchesByRentalId(rentalId: number): Promise<CarSwitchWithDetails[]>;
```

- [ ] **Step 3: Implement availability and affected-rental reads**

Use `classifyCarAvailability` for every car and return grouped arrays. `getAffectedRentals` filters with:

```ts
return db
  .select()
  .from(rentals)
  .where(
    and(
      eq(rentals.carId, carId),
      eq(rentals.isFinalized, false),
      gte(rentals.endDate, sql`CURRENT_DATE`),
    ),
  )
  .orderBy(rentals.startDate);
```

- [ ] **Step 4: Implement maintenance updates**

```ts
async setCarMaintenance(carId: number, reason: string, userId: string) {
  const [car] = await db
    .update(cars)
    .set({
      status: "maintenance",
      maintenanceReason: reason.trim(),
      maintenanceUpdatedAt: new Date(),
      maintenanceUpdatedBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(cars.id, carId))
    .returning();
  return car;
}

async clearCarMaintenance(carId: number, userId: string) {
  const [car] = await db
    .update(cars)
    .set({
      status: "available",
      maintenanceReason: null,
      maintenanceUpdatedAt: new Date(),
      maintenanceUpdatedBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(cars.id, carId))
    .returning();
  return car;
}
```

- [ ] **Step 5: Implement atomic switch**

Inside one `db.transaction`, lock the rental and replacement car with `FOR UPDATE`, reject finalized/current/maintenance/conflicting choices, update only `rentals.carId`, insert `carSwitches`, and insert `activityLogs`.

The activity log must use:

```ts
{
  userId,
  entityType: "rental_car_switch",
  entityId: String(rentalId),
  action: "updated",
  beforeData: {
    rental,
    oldCar,
    price: rental.totalAmount,
    paymentStatus: rental.paymentStatus,
    reservationStatus: rental.reservationStatus,
  },
  afterData: {
    rental: updatedRental,
    newCar,
    reason,
    price: updatedRental.totalAmount,
    paymentStatus: updatedRental.paymentStatus,
    reservationStatus: updatedRental.reservationStatus,
  },
}
```

Before returning, reload old car, new car, and user so the method returns a complete `CarSwitchWithDetails`.

- [ ] **Step 6: Verify**

Run: `npm.cmd test; npm.cmd run check`  
Expected: PASS.

- [ ] **Step 7: Commit storage**

```powershell
git add server/storage.ts
git commit -m "Add maintenance and atomic car switch storage"
```

## Task 4: API Routes and Permission Enforcement

**Files:**
- Modify: `server/routes.ts`
- Test: `server/availability.test.ts`

- [ ] **Step 1: Replace the local overlap implementation**

Import `datesConflict` and `validateDateRange` from `./availability`. Keep `findOverlappingRental`, but delegate its date comparison to `datesConflict` so every workflow uses one rule.

- [ ] **Step 2: Add availability route**

Validate query values with:

```ts
const availabilityQuery = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  excludeRentalId: z.coerce.number().int().positive().optional(),
});
```

Return `storage.getAvailability(...)`; map invalid ranges to HTTP 400.

- [ ] **Step 3: Add maintenance routes**

`PATCH /api/cars/:id/maintenance` accepts:

```ts
z.object({ reason: z.string().trim().min(3).max(500) })
```

`PATCH /api/cars/:id/availability` accepts no business fields. Both require `canManageOperations(user)`, reject missing cars, mutate state, and call `logActivity` with the complete old and new car.

- [ ] **Step 4: Add affected rentals route**

`GET /api/cars/:id/affected-rentals` returns `storage.getAffectedRentals(id)` to authenticated users.

- [ ] **Step 5: Add switch route**

`POST /api/rentals/:id/switch-car` accepts:

```ts
z.object({
  newCarId: z.number().int().positive(),
  reason: z.string().trim().min(3).max(500),
})
```

Require Manager/Admin, call `storage.switchRentalCar`, and map domain failures to:

- 404 for missing rental/car.
- 409 for finalized rental, maintenance car, same car, or date conflict.
- 403 for insufficient role.

- [ ] **Step 6: Add switch-history route**

`GET /api/rentals/:id/car-switches` returns `storage.getCarSwitchesByRentalId(id)` to authenticated users.

- [ ] **Step 7: Verify existing rental endpoints still use shared availability**

Run: `npm.cmd test; npm.cmd run check`  
Expected: PASS.

- [ ] **Step 8: Commit routes**

```powershell
git add server/routes.ts
git commit -m "Expose maintenance availability and car switch APIs"
```

## Task 5: Dedicated Availability Page

**Files:**
- Create: `client/src/pages/Availability.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/AppSidebar.tsx`
- Modify: `client/src/components/CreateRentalDialog.tsx`

- [ ] **Step 1: Add navigation**

Import `SearchCheck` from `lucide-react`, add:

```ts
{
  title: "Availability",
  url: "/availability",
  icon: SearchCheck,
},
```

Add `<Route path="/availability" component={Availability} />` after the dashboard route.

- [ ] **Step 2: Allow rental-prefill props**

Update `CreateRentalDialog` props:

```ts
type CreateRentalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCarId?: number;
  initialStartDate?: string;
  initialEndDate?: string;
};
```

When the dialog opens, call `form.reset` using these values while leaving `totalAmount` blank.

- [ ] **Step 3: Build the availability form**

Use controlled `startDate` and `endDate` strings. Enable the React Query request only after submit:

```ts
const { data, isFetching, error, refetch } = useQuery<AvailabilityResponse>({
  queryKey: ["/api/availability", `?startDate=${startDate}&endDate=${endDate}`],
  enabled: false,
});
```

Because the default query function joins keys with `/`, use an explicit query function:

```ts
queryFn: async () => {
  const response = await fetch(
    `/api/availability?startDate=${startDate}&endDate=${endDate}`,
    { credentials: "include" },
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json();
},
```

- [ ] **Step 4: Render grouped results**

Available cards show the vehicle image, name, model, plate, status text, and **Select & Create Rental**. Booked and maintenance sections use `Collapsible`; booked cards show conflicting dates, maintenance cards show the reason.

- [ ] **Step 5: Add loading, empty, and error states**

Use three car-card skeletons while loading. Empty available results show: “No cars are available for these dates” and a **Change dates** action. Errors show a **Try again** action.

- [ ] **Step 6: Verify responsive behavior**

At 375 pixels: one-column results, 44-pixel date fields/buttons, no horizontal page overflow. At desktop: three-column card grid.

- [ ] **Step 7: Verify**

Run: `npm.cmd run check; npm.cmd run build`  
Expected: PASS; only the existing chunk-size/PostCSS warnings may remain.

- [ ] **Step 8: Commit page**

```powershell
git add client/src/pages/Availability.tsx client/src/App.tsx client/src/components/AppSidebar.tsx client/src/components/CreateRentalDialog.tsx
git commit -m "Add fleet availability search"
```

## Task 6: Maintenance Controls and Affected Rentals

**Files:**
- Create: `client/src/components/MaintenanceStatusDialog.tsx`
- Modify: `client/src/components/CarDetailsDialog.tsx`
- Modify: `client/src/pages/Cars.tsx`

- [ ] **Step 1: Build maintenance dialog**

The dialog accepts `car`, `mode: "maintenance" | "available"`, and `onClose`. Maintenance mode requires a 3–500 character reason. Available mode shows a confirmation message.

Mutations call:

```ts
apiRequest("PATCH", `/api/cars/${car.id}/maintenance`, { reason })
apiRequest("PATCH", `/api/cars/${car.id}/availability`)
```

On success invalidate `/api/cars`, `/api/dashboard/stats`, `/api/dashboard/exceptions`, and affected rentals for the car.

- [ ] **Step 2: Add maintenance status to car details**

Show the current reason and an amber **Under Maintenance** badge. Managers/Admins see **Mark Under Maintenance** or **Return to Available**; regular users see read-only state.

- [ ] **Step 3: Fetch affected rentals**

When `car.status === "maintenance"`:

```ts
useQuery<Rental[]>({
  queryKey: [`/api/cars/${car.id}/affected-rentals`],
  enabled: Boolean(car.id && car.status === "maintenance"),
});
```

Render customer, dates, payment status, amount, and **Switch Car** for Managers/Admins.

- [ ] **Step 4: Refresh Fleet page data**

After maintenance changes, close dialogs or replace `selectedCar` with the refreshed car so stale status is never displayed.

- [ ] **Step 5: Verify**

Run: `npm.cmd run check; npm.cmd run build`  
Expected: PASS.

- [ ] **Step 6: Commit controls**

```powershell
git add client/src/components/MaintenanceStatusDialog.tsx client/src/components/CarDetailsDialog.tsx client/src/pages/Cars.tsx
git commit -m "Add maintenance controls and affected rentals"
```

## Task 7: Car-Switch Dialog and History

**Files:**
- Create: `client/src/components/SwitchCarDialog.tsx`
- Modify: `client/src/components/CarDetailsDialog.tsx`
- Modify: `client/src/components/RentalDetailsDialog.tsx`
- Modify: `client/src/pages/Logs.tsx`

- [ ] **Step 1: Build switch dialog data flow**

Accept `rental`, `currentCar`, `open`, and `onOpenChange`. Query:

```ts
`/api/availability?startDate=${rental.startDate}&endDate=${rental.endDate}&excludeRentalId=${rental.id}`
```

Display only `data.available` excluding `currentCar.id`.

- [ ] **Step 2: Require replacement and reason**

Use a radio-card group for replacement cars and a visible reason textarea. Disable confirmation until both are valid.

- [ ] **Step 3: Add immutable-price messaging**

Show:

```tsx
<Alert>
  <AlertTitle>Price and payments stay unchanged</AlertTitle>
  <AlertDescription>
    The rental remains ₱{formatCurrency(rental.totalAmount)}. Confirmed
    reservation and total-payment records will not be changed, and no refund
    will be created.
  </AlertDescription>
</Alert>
```

- [ ] **Step 4: Submit switch**

Call:

```ts
apiRequest("POST", `/api/rentals/${rental.id}/switch-car`, {
  newCarId: selectedCarId,
  reason: reason.trim(),
});
```

Invalidate rentals, cars, availability, dashboard, activity logs, and rental switch history. On HTTP 409, keep the dialog open and refetch availability.

- [ ] **Step 5: Connect affected rentals**

The **Switch Car** action in `CarDetailsDialog` opens this component for the selected affected rental.

- [ ] **Step 6: Show switch history in rental details**

Query `/api/rentals/:id/car-switches`. Render a chronological list with old car, new car, reason, user, and timestamp.

- [ ] **Step 7: Improve audit-log labels**

In `Logs.tsx`, render `entityType === "rental_car_switch"` as **Car Switch**, with old/new vehicle names and the unchanged rental price from before/after snapshots.

- [ ] **Step 8: Verify**

Run: `npm.cmd run check; npm.cmd run build`  
Expected: PASS.

- [ ] **Step 9: Commit workflow**

```powershell
git add client/src/components/SwitchCarDialog.tsx client/src/components/CarDetailsDialog.tsx client/src/components/RentalDetailsDialog.tsx client/src/pages/Logs.tsx
git commit -m "Add audited rental car switch workflow"
```

## Task 8: Database Migration and End-to-End Verification

**Files:**
- Modify: generated migration files under `migrations/`
- Verify: production build and live Render deployment

- [ ] **Step 1: Generate migration**

Run: `npx.cmd drizzle-kit generate`  
Expected: A migration adds the three car maintenance columns and `car_switches`.

- [ ] **Step 2: Review migration safety**

Confirm the migration contains only additive `ALTER TABLE cars ADD COLUMN` statements, `CREATE TABLE car_switches`, foreign keys, and indexes. It must not drop or recreate existing production tables.

- [ ] **Step 3: Apply schema to the configured Neon database**

Run: `npm.cmd run db:push`  
Expected: Drizzle reports successful schema synchronization.

- [ ] **Step 4: Run complete verification**

Run:

```powershell
npm.cmd test
npm.cmd run check
npm.cmd run build
git diff --check
```

Expected: Tests, type checking, and production build pass; diff check is clean.

- [ ] **Step 5: Manual workflow verification**

Verify:

1. Manager marks a car Under Maintenance with a reason.
2. Availability search excludes it.
3. Affected future rental is shown.
4. Switch dialog lists only eligible replacement cars.
5. Switch preserves `totalAmount`, reservation fields, payment fields, and dates.
6. Rental now points to the replacement car.
7. Switch history and activity log show old car, new car, reason, user, and time.
8. Returning the original car to Available makes it searchable again.
9. Regular user cannot mutate maintenance or switch cars.
10. Phone layout works at 375 pixels.

- [ ] **Step 6: Commit migration and final verification fixes**

```powershell
git add migrations shared server client package.json
git commit -m "Complete maintenance availability and car switching"
```

- [ ] **Step 7: Push and verify automatic deployment**

Run: `git push origin main`  
Expected: GitHub receives the commit and Render starts an Auto-Deploy for the same SHA.

- [ ] **Step 8: Confirm production**

Wait for Render status **Live**, then verify `https://ecprorentals.com/availability` loads after authentication and the API returns expected grouped availability.

## Deferred Work

The following remain intentionally outside this plan:

- Rental-agreement templates.
- Printable receipts.
- Handover and return checklists.
- Vehicle-condition photos.
- Digital or printable signatures.
- Repair start/end dates.
- Insurance, tire, and registration scheduling beyond the existing alerts.
- Refund processing.
- Automatic rental-price calculation.
