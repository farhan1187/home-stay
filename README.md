# Homestay Manager 🏡

A modern, mobile-friendly hospitality management web application built with **React (Vite)**, **Tailwind CSS**, and **Supabase (Auth + Postgres + Row Level Security)**. It is designed to manage 3 homestay properties run by two partners and their operational staff.

---

## 🌟 Key Features & Capabilities

- **3 Homestays Management:**
  - *Mountain Mist Retreat* (Munnar, Kerala)
  - *Riverside Heritage Villa* (Fort Kochi, Kerala)
  - *Coconut Grove Cottage* (Varkala Cliff, Kerala)
- **Role-Based Access Control (RBAC):**
  - **`super_admin`:** Complete authority. Creates/manages users, promotes roles, assigns homestays, resets passwords, and manages properties.
  - **`owner`:** Access to bookings, rooms, homestays, payments, expenses, complete financial analytics (income, net profit, repeat guests), and audit activity logs.
  - **`manager`:** Operational front desk: add/edit bookings, check-in/out guests, record payments, log expenses. Can **cancel** but **not delete** bookings. Views **only basic occupancy stats** (no financial totals or profit metrics). Can optionally be scoped to specific homestays.
- **Double Booking Prevention:**
  - Enforced in the PostgreSQL database using an **exclusion constraint** with the `btree_gist` extension:
    ```sql
    CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (
        room_id WITH =,
        daterange(check_in, check_out, '[)') WITH &&
    ) WHERE (status <> 'cancelled');
    ```
  - Treats the **check-out day as free for the next guest** (half-open interval `[check_in, check_out)`).
  - Friendly toast error is returned if a conflict occurs.
- **Auto Balance Due:**
  - Balance due is automatically computed as `total_amount - sum(payments)`.
  - Quick action to settle remaining balance in 1 click.
- **Interactive 30-Day Room Calendar:**
  - Rooms as rows, grouped by homestay, with 30 days as columns.
  - Click any empty cell to open a new booking pre-filled for that room and date.
  - Click any occupied bar to inspect the booking details, payment history, and check-in/out actions.
- **Financial Analytics (Recharts):**
  - Gross Income vs Operating Expenses = Net Profit trend chart.
  - Revenue by homestay per month.
  - 30-day room occupancy rates.
  - Repeat guests tracker (2+ stays).
- **Audit Activity Log:**
  - Populated automatically via PostgreSQL database triggers on `bookings`, `payments`, `expenses`, `rooms`, `homestays`, and `profiles`.
  - Includes expandable JSON details diff inspector.
- **CSV Data Export:**
  - 1-click CSV export for Bookings, Payments, and Operating Expenses.
- **Configurable Currency Symbol:**
  - Default is `₹`, configurable in one place in `src/lib/constants.ts` or via `VITE_CURRENCY_SYMBOL` in `.env`.
- **Dual-Mode Architecture (Live Supabase + Resilient Demo Mode):**
  - Works seamlessly with your live Supabase project.
  - When `.env` is unconfigured, automatically runs in interactive demo mode with realistic pre-seeded data, allowing instant testing and demonstration of all 3 roles.

---

## 🚀 Step-by-Step Setup Instructions

### Step 1: Create a Supabase Project
1. Go to [Supabase](https://supabase.com/) and create a new project.
2. Note your **Project URL** and **Anon Key** from **Project Settings → API**.

### Step 2: Execute the Database Migration
1. In your Supabase Dashboard, open the **SQL Editor**.
2. Open the file [`supabase/schema.sql`](file:///e:/HOME%20STAY/supabase/schema.sql) from this repository, copy its contents, and run it.
3. This creates:
   - Extensions: `btree_gist`, `pgcrypto`, `uuid-ossp`
   - Custom types: `user_role`, `booking_status`, `booking_source`, `payment_method`, `expense_category`
   - Tables: `profiles`, `homestays`, `rooms`, `manager_homestays`, `guests`, `bookings`, `payments`, `expenses`, `activity_log`
   - Helper functions: `get_my_role()`, `can_access_homestay()`
   - Triggers for automatic profile creation and audit logging
   - Exclusion constraint preventing overlapping room bookings
   - Strict Row Level Security (RLS) policies for all tables
   - Initial seed data for the 3 homestay properties and rooms

### Step 3: Create the First User & Promote to Super Admin
1. In the Supabase Dashboard, go to **Authentication → Users** and click **"Add user"** (Create user with your email and a password).
2. Go back to the **SQL Editor** and run the following snippet, replacing with your registered email:
   ```sql
   UPDATE public.profiles
   SET role = 'super_admin'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
   ```

### Step 4: Deploy the `admin-create-user` Edge Function
The application creates users securely via an authenticated Supabase Edge Function that verifies the caller is `super_admin` and utilizes the server-side service role key without exposing it to the browser.

Install the Supabase CLI (if not already installed) and deploy:
```bash
# 1. Log in to Supabase CLI
supabase login

# 2. Link your local project
supabase link --project-ref your-project-id

# 3. Deploy the function
supabase functions deploy admin-create-user --no-verify-jwt
```

### Step 5: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_CURRENCY_SYMBOL=₹
```

### Step 6: Start the Application
```bash
# Install dependencies (if needed)
npm install

# Run the local development server
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser.

---

## 👥 Role Permissions Matrix

| Feature / Screen | Super Admin | Owner / Partner | Manager |
|---|:---:|:---:|:---:|
| **Dashboard (Occupancy, Check-ins/outs)** | ✅ | ✅ | ✅ |
| **Financial Figures on Dashboard** | ✅ | ✅ | ❌ (Hidden) |
| **Bookings (Add, Edit, Phone Lookup)** | ✅ | ✅ | ✅ |
| **Check-in / Check-out Guests** | ✅ | ✅ | ✅ |
| **Record Payments & View Balance** | ✅ | ✅ | ✅ |
| **Cancel Bookings** | ✅ | ✅ | ✅ |
| **Delete Bookings** | ✅ | ✅ | ❌ (RLS Enforced) |
| **30-Day Room Calendar** | ✅ | ✅ | ✅ |
| **Financial Analytics & Profit (Recharts)** | ✅ | ✅ | ❌ (Hidden) |
| **Basic Stats (Occupancy only)** | ✅ | ✅ | ✅ |
| **Operating Expenses (Add & View)** | ✅ | ✅ | ✅ |
| **Homestays & Rooms Configuration** | ✅ | ✅ | ❌ |
| **Staff & Users Management** | ✅ | ❌ | ❌ |
| **Audit Activity Log** | ✅ | ✅ | ❌ |
| **Homestay Scoping** | All Properties | All Properties | Assigned Only |

---

## 📂 Project Architecture

```
e:\HOME STAY\
├── supabase/
│   ├── schema.sql                     # Complete PostgreSQL migration (RLS, Triggers, Exclusion Constraint)
│   └── functions/
│       └── admin-create-user/
│           ├── index.ts               # Edge Function: user creation, role assignment, password reset
│           └── deno.json
├── src/
│   ├── components/
│   │   ├── bookings/                  # BookingModal, PaymentModal, BookingDetailsModal
│   │   ├── calendar/                  # RoomCalendar (30-day interactive matrix)
│   │   ├── common/                    # Modal, Badge, Toast notifications
│   │   ├── expenses/                  # ExpenseModal
│   │   ├── homestays/                 # HomestayModal, RoomModal
│   │   ├── layout/                    # AppLayout, Header, Sidebar, MobileNav
│   │   └── users/                     # UserModal, ResetPasswordModal
│   ├── contexts/
│   │   ├── AuthContext.tsx            # Session, profile, demo role switcher
│   │   └── HomestayContext.tsx        # Active property filter & manager scoping
│   ├── lib/
│   │   ├── constants.ts               # Currency symbol (₹), category colors, role metadata
│   │   ├── csvExport.ts               # CSV download generators
│   │   ├── dateUtils.ts               # Half-open interval booking math & formatting
│   │   ├── mockData.ts                # Pre-seeded dataset for demo mode
│   │   └── supabase.ts                # Supabase client + resilient offline fallback
│   ├── pages/
│   │   ├── ActivityLogPage.tsx        # Audit trail viewer with JSON inspector
│   │   ├── AnalyticsPage.tsx          # Financial intelligence charts with Recharts
│   │   ├── BasicStatsPage.tsx         # Manager-only occupancy counts
│   │   ├── BookingsPage.tsx           # Searchable reservations list & CSV export
│   │   ├── CalendarPage.tsx           # 30-day visual availability matrix
│   │   ├── DashboardPage.tsx          # Today's front desk operations
│   │   ├── ExpensesPage.tsx           # Operating expenses list & modal
│   │   ├── LoginPage.tsx              # Staff authentication & recovery
│   │   ├── SetupGuideModal.tsx        # In-app setup instructions & SQL copy snippet
│   │   ├── SetupPage.tsx              # Property & Room configuration
│   │   └── UsersPage.tsx              # Super Admin user management
│   ├── types/
│   │   └── index.ts                   # Domain model TypeScript definitions
│   ├── App.tsx                        # Main application router
│   ├── index.css                      # Tailwind styling and mobile responsiveness
│   └── main.tsx
├── .env.example                       # Sample environment variables
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 🔒 Security Best Practices

1. **Row Level Security (RLS):** Every single database table has RLS enabled with explicit policies checking `get_my_role()`. Permissions are enforced in the database engine, not merely by hiding UI buttons.
2. **Service Role Key Isolation:** The service role key is strictly utilized in the Supabase Edge Function (`admin-create-user`) and is never embedded in the frontend bundle.
3. **No Double Bookings:** Guaranteed by PostgreSQL exclusion constraints with `daterange(check_in, check_out, '[)')` where `status <> 'cancelled'`.
4. **No Public Sign-Up:** Staff accounts must be provisioned by a Super Admin.
