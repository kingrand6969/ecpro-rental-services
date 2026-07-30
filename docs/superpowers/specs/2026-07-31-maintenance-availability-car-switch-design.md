# Maintenance, Availability, and Car-Switch Design

Date: 2026-07-31  
Project: ECPRO Rental Services  
Status: Approved visual design; awaiting written-spec approval

## Scope

This release adds three connected operational capabilities:

1. Mark a vehicle **Under Maintenance** or return it to **Available**.
2. Search fleet availability for a selected rental date range.
3. Switch an existing rental to an available replacement vehicle when the original vehicle cannot be used.

Rental agreements, receipts, vehicle handover/return checklists, photos, and signatures are explicitly parked until the owner provides a contract template.

## Decisions

- A Manager manually sets each rental price. Availability search does not calculate or suggest pricing.
- Switching vehicles never changes the rental price.
- Confirmed reservation and total-payment records remain unchanged during a vehicle switch.
- The business does not issue a refund as part of this workflow.
- Repair dates and maintenance schedules are not tracked in this release.
- Maintenance uses a simple state: **Under Maintenance** until a Manager or Admin returns the car to **Available**.
- The primary interface is a dedicated **Availability** page.

## Roles and Permissions

### Admin

- View availability.
- Mark a car Under Maintenance.
- Return a car to Available.
- View affected rentals.
- Switch a rental to a replacement car.
- View complete audit details.

### Manager

- View availability.
- Mark a car Under Maintenance.
- Return a car to Available.
- View affected rentals.
- Switch a rental to a replacement car.
- Create a rental from an availability result and set its price manually.

### Regular User

- View vehicle availability and maintenance status.
- Cannot change maintenance status.
- Cannot switch rental vehicles.

All server endpoints enforce these permissions independently of the interface.

## Availability Page

Add **Availability** to the authenticated sidebar.

The page contains:

- Start-date field.
- End-date field.
- **Check Availability** action.
- Available-car results.
- Collapsible **Already Booked** results.
- Collapsible **Under Maintenance** results.

Each available-car result shows:

- Vehicle photo when available.
- Vehicle name, model, and plate number.
- Available status.
- **Select & Create Rental** action.

Selecting a car opens the existing create-rental dialog with the selected car and date range prefilled. The Manager enters the rental price manually before saving.

### Availability Rules

A car is available only when:

- It is not Under Maintenance.
- It has no rental that conflicts with the selected range.

The existing same-day handover rule remains unchanged:

- A rental ending on a date may be followed by another rental starting on that same date.
- Two same-day rentals on the same car and date conflict.

Availability is recalculated on the server when the search runs and again when a booking or switch is submitted. This prevents stale results from causing a double booking.

Invalid ranges are rejected:

- Both dates are required.
- The end date cannot be before the start date.

## Maintenance State

Car details gain:

- **Mark Under Maintenance** action.
- Required maintenance reason.
- **Return to Available** action.
- Affected-rentals section.

Marking a car Under Maintenance:

- Immediately excludes it from availability search.
- Prevents new rentals from being created for that car.
- Prevents existing rentals from being switched to that car.
- Does not automatically alter or delete existing rentals.
- Displays all non-finalized current and future rentals assigned to the car.

Returning a car to Available requires confirmation. It clears the active maintenance block but preserves the maintenance history and reason in the audit trail.

## Affected Rentals

An affected rental is a non-finalized rental assigned to a car that is Under Maintenance and whose end date is today or later.

The affected-rentals section shows:

- Customer name.
- Rental dates.
- Payment status and total amount.
- **Switch Car** action.

The application does not automatically move affected rentals. Staff must review and confirm each switch.

## Car-Switch Workflow

The switch dialog displays:

- Rental ID and customer.
- Original vehicle.
- Rental dates.
- Current rental price.
- Payment and reservation status.
- Replacement vehicles available for the exact original rental dates.
- Required switch reason.
- Confirmation that price and payments remain unchanged.

The Manager or Admin selects a replacement and confirms.

The server then:

1. Reloads the rental.
2. Verifies the user has Manager or Admin permission.
3. Verifies the rental is not finalized.
4. Verifies the replacement car exists.
5. Verifies the replacement is not the current car.
6. Verifies the replacement is not Under Maintenance.
7. Rechecks date conflicts while excluding the rental being switched.
8. Updates only the rental's `carId`.
9. Preserves rental dates, duration, customer, price, reservation, payment, notes, and finalization state.
10. Creates a dedicated car-switch history record and unified activity-log entry.

If the replacement becomes unavailable before confirmation, the switch fails with a clear message and refreshes the available-car list.

## Data Model

### Cars

Add:

- `maintenanceReason`: nullable text.
- `maintenanceUpdatedAt`: nullable timestamp.
- `maintenanceUpdatedBy`: nullable user ID.

The existing `status` value stores `maintenance` while blocked and `available` after release. The live API may still present `rented` when an available car has an active rental.

### Car Switches

Add a `car_switches` table:

- `id`
- `rentalId`
- `oldCarId`
- `newCarId`
- `reason`
- `userId`
- `switchedAt`

Car and rental deletion behavior must preserve audit value. IDs and display-name snapshots should remain available in the unified activity-log data even if a referenced record is later removed.

## API Design

Add:

- `GET /api/availability?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `PATCH /api/cars/:id/maintenance`
- `PATCH /api/cars/:id/availability`
- `GET /api/cars/:id/affected-rentals`
- `POST /api/rentals/:id/switch-car`
- `GET /api/rentals/:id/car-switches`

All mutation endpoints create unified activity-log records with complete before/after context.

## Interface and Responsive Behavior

- Desktop uses a multi-column available-car grid.
- Phone uses a one-column card list.
- Date fields and actions meet a minimum 44-pixel touch target.
- Booked and maintenance results are visually distinct with text and icons, not color alone.
- The switch dialog becomes a full-height scrollable sheet on small phones.
- Primary confirmation remains visible without covering content.
- Loading uses shaped skeletons.
- Empty availability explains why no cars match and offers a date-change action.
- API errors include a clear recovery action.

## Error Handling

The interface must clearly handle:

- Invalid or missing dates.
- No available cars.
- Car changed to Under Maintenance after search.
- Car booked by another user after search.
- Rental finalized before switch.
- Missing replacement car.
- Unauthorized action.
- Failed maintenance or switch request.

No failed switch may partially update a rental or its audit records. The rental update and switch-history creation must run atomically in one database transaction.

## Testing

Server tests or equivalent route-level verification cover:

- Maintenance cars excluded from availability.
- Overlapping cars excluded from availability.
- Same-day handover remains allowed.
- Same-day duplicate rental remains blocked.
- Regular users cannot change maintenance state or switch cars.
- Managers and Admins can change maintenance state and switch cars.
- Switching preserves price and every payment field.
- Switching rejects an unavailable replacement.
- Switching rejects a finalized rental.
- Concurrent replacement attempts cannot double-book.
- Audit and car-switch records are created.

Interface verification covers:

- Desktop and 375-pixel phone layouts.
- Keyboard operation and visible focus.
- Loading, empty, and error states.
- Prefilled create-rental car and dates.
- Maintenance and affected-rental actions.
- Car-switch confirmation messaging.

## Rollout

1. Add database fields and the car-switch table.
2. Deploy server endpoints and permission checks.
3. Add the Availability page and sidebar entry.
4. Add maintenance controls and affected rentals to car details.
5. Add the switch dialog and history display.
6. Run type checking, production build, and workflow verification.
7. Push to `main` and confirm Render auto-deployment.

The existing dashboard, fleet, rentals, payments, and audit logs remain operational throughout the rollout.
