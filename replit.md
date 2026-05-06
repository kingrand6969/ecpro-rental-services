# ECPro Rental Services

A comprehensive car rental booking system with user authentication, calendar-based reservations, financial tracking, and admin controls.

## Run & Operate

```bash
npm run dev        # Start development server
npm run db:push    # Push schema changes to database
```

**Environment Variables:**
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Express session secret
- Object Storage environment variables (auto-configured)

## Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Express.js, Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **Auth**: passport-local (scrypt hashing)
- **File Storage**: Google Cloud Storage

## Where things live

- `client/`: Frontend React application
- `server/`: Backend Express application
- `shared/schema.ts`: Database schema and shared types (source-of-truth for DB schema)
- `design_guidelines.md`: UI/UX design guidelines (source-of-truth for theme)
- `client/src/index.css`: Reusable UI utilities like `glass-panel`, `text-neon-cyan`, `shadow-cyan-glow`

## Architecture decisions

- New users require admin approval before login.
- Financial reports pro-rate income for rentals spanning month boundaries.
- Oil change alerts trigger based on mileage or time, configurable per car.
- OR CR Registration Warning is a three-state system (ok/warning/overdue) with a 36-month initial countdown and 12-month cycle after confirmation.
- The `Admin` user (literal username "Admin") has elevated privileges for finalizing rentals and enforcing payment confirmation rules.
- Two-stage payments (Reservation + Total) are tracked independently, with only the Total Payment contributing to financial income.

## Product

- User authentication with admin approval.
- Calendar dashboard for reservation overview.
- Fleet management with maintenance tracking.
- Rental booking and management with payment screenshot uploads.
- Financial tracking with monthly/quarterly/yearly reporting including amortization.
- Admin controls for user and system management.
- Customer management for history and contact information.

## User preferences

- _Populate as you build_

## Gotchas

- New users must be approved by an administrator to log in.
- Finalizing a rental (setting `isFinalized=true`) and confirming a rental's `paymentStatus="confirmed"` can only be done by the literal `Admin` user.
- Confirming a payment (reservation or total) requires both a `paymentDate` and `paymentBank`.
- Deleting expenses is restricted to admin users.

## Pointers

- **UI/UX Design**: Refer to `design_guidelines.md` for visual theme and component usage.
- **Database Schema**: See `shared/schema.ts` for table structures and relationships.
- **Drizzle ORM**: [https://orm.drizzle.team/](https://orm.drizzle.team/)
- **React**: [https://react.dev/](https://react.dev/)
- **Express.js**: [https://expressjs.com/](https://expressjs.com/)
- **TailwindCSS**: [https://tailwindcss.com/](https://tailwindcss.com/)
- **shadcn/ui**: [https://ui.shadcn.com/](https://ui.shadcn.com/)