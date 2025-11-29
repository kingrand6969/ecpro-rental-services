# CarRent Pro - Car Rental Booking System

## Overview
A comprehensive car rental booking system with user authentication, calendar-based reservations with color-coded cars, financial tracking, and admin controls.

## Core Features
- **User Authentication**: Replit Auth (OpenID Connect) with session management
- **Calendar Dashboard**: Color-coded calendar view showing all reservations
- **Fleet Management**: Add/edit cars with maintenance tracking (oil change alerts)
- **Rental Bookings**: Create and manage rental reservations with payment screenshot uploads
- **Financial Tracking**: Track income, expenses, and net profit by month
- **Admin Controls**: User management, role-based access control

## Tech Stack
- **Frontend**: React 18, TypeScript, TailwindCSS, shadcn/ui components
- **Backend**: Express.js, Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **Auth**: Replit Auth (OIDC)
- **File Storage**: Google Cloud Storage (Object Storage)

## Project Structure
```
├── client/                   # Frontend React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── AppSidebar.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── CreateRentalDialog.tsx
│   │   │   ├── AddCarDialog.tsx
│   │   │   ├── CarExpensesDialog.tsx
│   │   │   ├── CarDetailsDialog.tsx
│   │   │   ├── RentalDetailsDialog.tsx
│   │   │   ├── EditRentalDialog.tsx
│   │   │   ├── ObjectUploader.tsx
│   │   │   └── ui/           # shadcn components
│   │   ├── hooks/           # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   └── useTheme.ts
│   │   ├── pages/           # Route pages
│   │   │   ├── Landing.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Cars.tsx
│   │   │   ├── Rentals.tsx
│   │   │   ├── Finances.tsx
│   │   │   └── Admin.tsx
│   │   ├── lib/             # Utilities
│   │   └── App.tsx          # Main app with routing
│   └── index.html
├── server/                   # Backend Express application
│   ├── db.ts                # Database connection
│   ├── storage.ts           # Data access layer
│   ├── routes.ts            # API endpoints
│   ├── replitAuth.ts        # Replit Auth setup
│   ├── objectStorage.ts     # File upload handling
│   └── objectAcl.ts         # Access control for files
├── shared/
│   └── schema.ts            # Database schema & types
└── design_guidelines.md     # UI/UX design guidelines
```

## Database Schema
- **users**: User profiles from Replit Auth (id, email, firstName, lastName, isAdmin)
- **cars**: Fleet vehicles (name, model, plateNumber, colorCode, monthlyPayment, mileage tracking)
- **rentals**: Booking records (customer info, dates, amount, payment screenshot)
- **expenses**: Car-related expenses (category, amount, mileage)
- **monthly_payments**: Car payment tracking by month/year
- **sessions**: Express session storage

## API Endpoints

### Authentication
- `GET /api/login` - Initiate Replit Auth login
- `GET /api/callback` - OAuth callback
- `GET /api/logout` - Logout
- `GET /api/auth/user` - Get current user

### Cars
- `GET /api/cars` - List all cars
- `GET /api/cars/:id` - Get car by ID
- `POST /api/cars` - Create car (admin only)
- `PATCH /api/cars/:id` - Update car (admin only)
- `DELETE /api/cars/:id` - Delete car (admin only)
- `POST /api/cars/:id/oil-change` - Record oil change (admin only)

### Rentals
- `GET /api/rentals` - List all rentals
- `GET /api/rentals/:id` - Get rental by ID
- `POST /api/rentals` - Create rental
- `PATCH /api/rentals/:id` - Update rental (admin can edit finalized)
- `DELETE /api/rentals/:id` - Delete rental (admin only)

### Expenses
- `GET /api/expenses` - List all expenses
- `GET /api/cars/:carId/expenses` - Get expenses for a car
- `POST /api/expenses` - Create expense
- `DELETE /api/expenses/:id` - Delete expense (admin only)

### File Uploads
- `POST /api/objects/upload` - Get signed upload URL
- `PUT /api/payment-screenshots` - Set payment screenshot

### Admin
- `GET /api/admin/users` - List all users (admin only)
- `PATCH /api/admin/users/:id/toggle-admin` - Toggle user admin status
- `GET /api/admin/stats` - Get system stats

## Business Rules
1. **Non-editable rentals**: Once finalized, only admins can edit
2. **Payment screenshots**: Required for each rental
3. **Oil change alerts**: Automatically calculated based on mileage intervals
4. **Color-coded calendar**: 8 distinct colors for different cars

## Development
```bash
npm run dev        # Start development server
npm run db:push    # Push schema changes to database
```

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Express session secret
- `REPL_ID` - Replit project ID (auto-set)
- `ISSUER_URL` - Replit OIDC issuer (auto-set)
- Object Storage environment variables (auto-configured)
