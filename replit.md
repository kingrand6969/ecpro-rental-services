# CarRent Pro - Car Rental Booking System

## Overview
A comprehensive car rental booking system with user authentication, calendar-based reservations with color-coded cars, financial tracking, and admin controls.

## Core Features
- **User Authentication**: Local username/password authentication with session management + admin approval system
- **Calendar Dashboard**: Color-coded calendar view showing all reservations
- **Fleet Management**: Add/edit cars with maintenance tracking (oil change alerts)
- **Rental Bookings**: Create and manage rental reservations with payment screenshot uploads
- **Financial Tracking**: Monthly/Quarterly/Yearly reporting with income, expenses, net profit, and amortization deductions
- **Admin Controls**: User management, role-based access control, user approval system
- **Customer Management**: Track customer history, rental patterns, and contact information

## Tech Stack
- **Frontend**: React 18, TypeScript, TailwindCSS, shadcn/ui components
- **Backend**: Express.js, Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **Auth**: Local authentication (passport-local with scrypt password hashing)
- **File Storage**: Google Cloud Storage (Object Storage)

## Default Admin Account
- **Username**: Admin
- **Password**: Admin999

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
│   │   │   ├── Auth.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Cars.tsx
│   │   │   ├── Rentals.tsx
│   │   │   ├── Customers.tsx
│   │   │   ├── Finances.tsx
│   │   │   └── Admin.tsx
│   │   ├── lib/             # Utilities
│   │   └── App.tsx          # Main app with routing
│   └── index.html
├── server/                   # Backend Express application
│   ├── db.ts                # Database connection
│   ├── storage.ts           # Data access layer
│   ├── routes.ts            # API endpoints
│   ├── auth.ts              # Local authentication setup
│   ├── objectStorage.ts     # File upload handling
│   └── objectAcl.ts         # Access control for files
├── shared/
│   └── schema.ts            # Database schema & types
└── design_guidelines.md     # UI/UX design guidelines
```

## Database Schema
- **users**: User profiles (id, username, password, email, firstName, lastName, isAdmin, isApproved)
- **customers**: Customer profiles (name, phone, email, notes, rental history)
- **cars**: Fleet vehicles (name, model, plateNumber, colorCode, monthlyPayment, mileage tracking)
- **rentals**: Booking records (customer info, dates, amount, payment screenshot)
- **expenses**: Car-related expenses (category, amount, mileage)
- **monthly_payments**: Car payment tracking by month/year
- **sessions**: Express session storage

## API Endpoints

### Authentication
- `POST /api/register` - Register new user (requires admin approval, reserved usernames blocked)
- `POST /api/login` - Login with username/password (checks approval status)
- `POST /api/logout` - Logout
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
- `PATCH /api/admin/users/:id/toggle-admin` - Toggle user admin status (admin only)
- `PATCH /api/admin/users/:id/approve` - Approve pending user (admin only)
- `GET /api/admin/pending-users` - List pending user approvals (admin only)
- `GET /api/admin/stats` - Get system stats (admin only)

## Business Rules
1. **User Approval**: New users must be approved by admin before they can login
2. **Non-editable rentals**: Once finalized, only admins can edit
3. **Payment screenshots**: Required for each rental
4. **Oil change alerts**: Automatically calculated based on mileage intervals
5. **Color-coded calendar**: 8 distinct colors for different cars
6. **Amortization tracking**: Monthly car payments deducted from net profit in financial reports

## Recent Changes (Dec 2, 2025)
- **Template literal bugs fixed**: Fixed broken `₱{` patterns throughout app
- **Quarterly/Yearly reporting**: Added period type selector (Monthly/Quarterly/Yearly) in Finances page
- **Amortization deduction**: Income by Car table now shows amortization deduction with net after amortization
- **User approval system**: New users are created with `isApproved: false` and cannot login until admin approval
- **Pending approvals**: Admin page now shows pending user registrations with approve button

## Development
```bash
npm run dev        # Start development server
npm run db:push    # Push schema changes to database
```

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Express session secret
- Object Storage environment variables (auto-configured)
