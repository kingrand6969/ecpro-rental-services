# Car Rental Booking System - Design Guidelines

## Design Approach
**System-Based Approach**: Drawing from Linear's clean typography and restraint, Notion's data organization patterns, and Google Calendar's clear time-based visualizations. This utility-focused application prioritizes efficiency, clarity, and information density over visual flair.

**Core Principles**:
- Information clarity above decoration
- Efficient workflows with minimal clicks
- Strong visual hierarchy for data scanning
- Professional, trustworthy aesthetic for financial tracking

---

## Typography

**Font Family**: Inter (via Google Fonts CDN)

**Hierarchy**:
- **Page Headers**: text-2xl font-semibold (Dashboard, Calendar, Cars, Finances)
- **Section Headers**: text-lg font-medium (Rental Details, Expense Log, Monthly Summary)
- **Data Labels**: text-sm font-medium tracking-tight
- **Body Text**: text-sm font-normal
- **Financial Figures**: text-xl font-semibold tabular-nums (for alignment)
- **Calendar Dates**: text-base font-medium
- **Metadata/Timestamps**: text-xs text-gray-600

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 3, 4, 6, and 8 exclusively (e.g., p-4, gap-6, mb-8, space-y-3)

**Container Strategy**:
- Main dashboard: max-w-7xl mx-auto with px-6
- Forms/modals: max-w-2xl
- Calendar view: Full width with px-6
- Sidebar navigation: Fixed w-64

**Grid Patterns**:
- Car cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Financial metrics: grid-cols-2 lg:grid-cols-4 gap-4
- Expense records: Single column table with sticky headers

---

## Component Library

### Navigation
- **Sidebar**: Fixed left navigation (w-64) with logo at top, main navigation items, and admin section at bottom
- **Icons**: Heroicons (outline style) - use Calendar, CreditCard, Truck, ChartBar, Cog for main nav
- **Active States**: Subtle background with left border accent

### Calendar Interface
- **Month View**: Grid layout with 7 columns, date numbers in top-left of cells
- **Color Coding**: Each car gets assigned color (use 8 distinct colors: blue, green, purple, orange, pink, teal, indigo, amber)
- **Rental Indicators**: Small rounded rectangles spanning rental duration with car name and truncated customer info
- **Legend**: Fixed position showing car name + color dot mapping

### Forms & Inputs
- **Input Fields**: Bordered inputs with focus ring, label above (text-sm font-medium)
- **Disabled State**: Gray background with cursor-not-allowed for finalized rentals
- **File Upload**: Drag-and-drop zone with dashed border for payment screenshots
- **Date Pickers**: Native date inputs with calendar icon prefix
- **Number Inputs**: Right-aligned for amounts with currency prefix display

### Data Display
- **Stat Cards**: White background with border, displaying metric name, large number, and trend indicator
- **Financial Summary**: Three-column layout showing Total Income | Total Expenses | Net Profit with color-coded positive/negative values
- **Progress Tracker**: Horizontal bar showing monthly payment progress with percentage and amount remaining
- **Tables**: Striped rows (even rows with subtle gray), sticky header, right-aligned numeric columns

### Car Management
- **Car Cards**: Image thumbnail (if available), car name as header, key specs (model, plate, status), action buttons at bottom
- **Expense Log**: Chronological list with date, category, amount, mileage reading, and description
- **Maintenance Alerts**: Badge indicators showing "Oil Change Due" when mileage threshold reached

### Modals & Overlays
- **Booking Modal**: Centered overlay (max-w-2xl) with car details at top, rental form in middle, payment screenshot upload at bottom
- **Confirmation Dialogs**: Small centered modal (max-w-md) for admin edit confirmations
- **Backdrop**: Dark semi-transparent (bg-black/50)

### Buttons
- **Primary**: Solid background for main actions (Add Car, Finalize Booking, Save)
- **Secondary**: Bordered outline for alternative actions (Cancel, View Details)
- **Danger**: Red variant for destructive admin actions (Delete Expense)
- **Icon Buttons**: Square with hover background for table actions

### Status Indicators
- **Rental Status**: Pill badges with appropriate colors (Active: green, Completed: gray, Upcoming: blue)
- **Payment Status**: Icon + text combination (Verified checkmark, Pending clock)

---

## Authentication Pages

**Login/Register**: Centered card layout (max-w-md) with logo at top, form fields, social login buttons (Replit Auth integration), and toggle between login/register

---

## Images

**No hero images required** - this is a utility application focused on data and functionality.

**Car Images**: Thumbnail images (aspect-ratio-video, object-cover) in car cards and booking modals to help identify vehicles visually. These are functional, not decorative.

**Payment Screenshots**: Display uploaded payment proofs as thumbnails in rental records with click-to-expand functionality.

---

## Responsive Behavior

- **Desktop (lg+)**: Sidebar visible, multi-column grids, expanded calendar view
- **Tablet (md)**: Collapsible sidebar, 2-column grids, compact calendar
- **Mobile**: Hidden sidebar with hamburger menu, single-column layouts, list view option for calendar