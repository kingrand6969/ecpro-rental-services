# ECPro Rental Services

A comprehensive car rental booking system with user authentication, calendar-based reservations, financial tracking, and admin controls.

## Run & Operate

```bash
cp .env.example .env   # then fill in the values
npm install
npm run db:push        # push schema to the database (first run / schema changes)
npm run dev            # start development server (http://localhost:5000)
```

Production:

```bash
npm run build
npm start
```

**Environment variables** (see `.env.example`):
- `DATABASE_URL`: PostgreSQL connection string (Neon or any Postgres)
- `SESSION_SECRET`: Express session secret
- `PORT`: server port (default 5000)
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`: Cloudflare R2 object storage for payment screenshots and car photos

## Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Express.js, Drizzle ORM
- **Database**: PostgreSQL (Neon-compatible serverless driver)
- **Auth**: passport-local (scrypt hashing), sessions in Postgres
- **File Storage**: Cloudflare R2 (S3-compatible, presigned uploads)

## Where things live

- `client/`: Frontend React application
- `server/`: Backend Express application
- `server/objectStorage.ts`: R2 presigned-upload + streaming-download service
- `shared/schema.ts`: Database schema and shared types (source-of-truth for DB schema)
- `design_guidelines.md`: UI/UX design guidelines (source-of-truth for theme)
- `client/src/index.css`: Reusable UI utilities like `glass-panel`, `text-neon-cyan`, `shadow-cyan-glow`

## File uploads

The client asks `POST /api/objects/upload` for a presigned R2 PUT URL plus a
normalized `objectPath` (`/objects/uploads/<uuid>`), uploads the file directly
to R2, and stores the `objectPath`. Files are always served through the
authenticated `GET /objects/...` route, which streams from R2 — the bucket
itself stays private.

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

## Gotchas

- New users must be approved by an administrator to log in.
- Finalizing a rental (setting `isFinalized=true`) and confirming a rental's `paymentStatus="confirmed"` can only be done by the literal `Admin` user.
- Confirming a payment (reservation or total) requires both a `paymentDate` and `paymentBank`.
- Deleting expenses is restricted to admin users.
- Screenshot/photo files uploaded while the app ran on Replit live in Replit's
  object storage; their old paths will 404 until those files are copied into
  the R2 bucket (`data_export/database_backup.sql` holds the DB rows).

## Deployment (Render free tier)

`render.yaml` describes a free web service. Create the service from this repo
in Render, then set the environment variables above in the Render dashboard.
The free instance sleeps after ~15 minutes idle; first request after that
takes ~30–60s.

## Pointers

- **UI/UX Design**: Refer to `design_guidelines.md` for visual theme and component usage.
- **Database Schema**: See `shared/schema.ts` for table structures and relationships.
- **Drizzle ORM**: [https://orm.drizzle.team/](https://orm.drizzle.team/)
- **React**: [https://react.dev/](https://react.dev/)
- **Express.js**: [https://expressjs.com/](https://expressjs.com/)
- **TailwindCSS**: [https://tailwindcss.com/](https://tailwindcss.com/)
- **shadcn/ui**: [https://ui.shadcn.com/](https://ui.shadcn.com/)
