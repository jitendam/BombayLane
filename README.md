# BombayLane — Food Truck Ordering Platform (v2)

A full-stack food truck ordering website built with **Next.js 14 App Router**, **Tailwind CSS**, **Supabase** (auth + PostgreSQL), and **Stripe** for payments. Customers browse the menu, add items to a cart, and pay online. The truck owner sees every new order appear in real-time on an admin dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, React Server Components) |
| Styling | Tailwind CSS v3 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password + magic link) |
| Payments | Stripe (Checkout Sessions + Webhooks) |
| Real-time | Supabase Realtime (Postgres Changes) |
| ORM | Supabase JS client (no extra ORM needed) |
| Deployment | Vercel (frontend + API routes) |

---

## Project Structure

```
bombaylane/
├── app/                          # Next.js App Router root
│   ├── layout.tsx                # Root layout (fonts, global providers)
│   ├── page.tsx                  # Landing / home page
│   ├── menu/
│   │   └── page.tsx              # Public menu page (SSR)
│   ├── cart/
│   │   └── page.tsx              # Shopping cart (client component)
│   ├── checkout/
│   │   ├── page.tsx              # Checkout confirmation page
│   │   └── success/page.tsx      # Post-payment success page
│   ├── admin/
│   │   ├── layout.tsx            # Admin layout (auth guard)
│   │   ├── page.tsx              # Admin dashboard — live order feed
│   │   ├── menu/page.tsx         # Manage menu items (CRUD)
│   │   └── orders/page.tsx       # Full order history + status updates
│   └── auth/
│       ├── login/page.tsx        # Login page
│       └── callback/route.ts     # Supabase OAuth callback handler
│
├── components/
│   ├── menu/
│   │   ├── MenuGrid.tsx          # Grid of menu item cards
│   │   ├── MenuItemCard.tsx      # Single item card with "Add to cart"
│   │   └── CategoryFilter.tsx    # Filter bar (Veg / Non-veg / Category)
│   ├── cart/
│   │   ├── CartDrawer.tsx        # Slide-out cart panel
│   │   ├── CartItem.tsx          # Individual cart line item
│   │   └── CartSummary.tsx       # Subtotal, tax, fees, totals
│   ├── admin/
│   │   ├── OrderCard.tsx         # Real-time order card
│   │   ├── OrderStatusBadge.tsx  # Coloured status pill
│   │   └── MenuItemForm.tsx      # Add / edit menu item form
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       └── Toast.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser-side Supabase client
│   │   ├── server.ts             # Server-side Supabase client (cookies)
│   │   └── middleware.ts         # Auth session refresh middleware
│   ├── stripe.ts                 # Stripe SDK singleton
│   └── constants.ts              # TAX_RATE, FREE_DELIVERY_THRESHOLD, etc.
│
├── hooks/
│   ├── useCart.ts                # Cart state (Zustand store)
│   ├── useOrders.ts              # Supabase Realtime order subscription
│   └── useMenu.ts                # SWR-based menu data fetching
│
├── app/api/
│   ├── checkout/route.ts         # POST — create Stripe Checkout Session
│   ├── webhooks/stripe/route.ts  # POST — handle Stripe events (raw body)
│   └── orders/
│       ├── route.ts              # GET all orders (admin) / POST new order
│       └── [id]/
│           └── status/route.ts   # PATCH — update order status
│
├── middleware.ts                 # Next.js middleware — protect /admin routes
│
├── public/
│   ├── logo.svg
│   └── placeholder-food.jpg
│
├── styles/
│   └── globals.css               # Tailwind base + custom CSS variables
│
├── supabase/
│   ├── migrations/               # SQL migration files
│   │   └── 0001_init.sql
│   └── seed.sql                  # Development seed data
│
├── .env.local.example            # Required environment variables
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Database Tables (Supabase / PostgreSQL)

All IDs are `uuid` with `gen_random_uuid()` as the default.

### `profiles`
Extends Supabase `auth.users`. Created automatically via a trigger on sign-up.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | References `auth.users(id)` |
| `name` | `text` | Display name |
| `role` | `text` | `customer` \| `admin` (default `customer`) |
| `phone` | `text` | Optional |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Updated via trigger |

### `categories`
Top-level menu groupings (e.g. *Starters*, *Mains*, *Drinks*, *Desserts*).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` UNIQUE | e.g. `Starters` |
| `sort_order` | `int` | Display ordering |
| `created_at` | `timestamptz` | |

### `menu_items`
Every item available on the truck's menu.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `category_id` | `uuid` FK → `categories` | |
| `name` | `text` | |
| `description` | `text` | |
| `price` | `numeric(10,2)` | In INR (or local currency) |
| `image_url` | `text` | |
| `is_vegetarian` | `bool` | Default `false` |
| `is_available` | `bool` | Default `true` |
| `stripe_price_id` | `text` | Stripe Price object ID |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `orders`
One row per customer checkout.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `customer_id` | `uuid` FK → `profiles` | |
| `status` | `text` | `pending` \| `confirmed` \| `preparing` \| `ready` \| `completed` \| `cancelled` |
| `subtotal` | `numeric(10,2)` | |
| `tax` | `numeric(10,2)` | |
| `delivery_fee` | `numeric(10,2)` | |
| `total` | `numeric(10,2)` | |
| `delivery_address` | `text` | |
| `stripe_session_id` | `text` UNIQUE | Stripe Checkout Session ID |
| `stripe_payment_intent` | `text` | |
| `notes` | `text` | Customer special instructions |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `order_items`
Line items within an order (snapshot of price at time of purchase).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `order_id` | `uuid` FK → `orders` | |
| `menu_item_id` | `uuid` FK → `menu_items` | |
| `name` | `text` | Snapshot of item name |
| `quantity` | `int` | |
| `unit_price` | `numeric(10,2)` | Snapshot of price |
| `total_price` | `numeric(10,2)` | `quantity × unit_price` |

---

## Row-Level Security (RLS) Summary

| Table | Customer reads | Customer writes | Admin |
|---|---|---|---|
| `profiles` | Own row only | Own row only | All rows |
| `categories` | All | — | Full CRUD |
| `menu_items` | `is_available = true` | — | Full CRUD |
| `orders` | Own rows | Insert own | All rows |
| `order_items` | Own order rows | Insert own | All rows |

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Getting Started

### 1. Clone and install dependencies

```bash
git clone https://github.com/jitendam/BombayLane.git
cd BombayLane
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migration file in the Supabase SQL editor:
   ```
   supabase/migrations/0001_init.sql
   ```
3. (Optional) Run `supabase/seed.sql` to populate demo menu data.
4. Copy **Project URL** and **anon public key** into `.env.local`.

### 3. Set up Stripe

1. Create a [Stripe](https://stripe.com) account.
2. Copy the **Publishable key** and **Secret key** into `.env.local`.
3. For local webhook testing:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Paste the printed webhook secret into `STRIPE_WEBHOOK_SECRET`.

### 4. Run the development server

```bash
npm run dev
```

Open **http://localhost:3000**.

---

## Key Features

- **Customer menu** — Browse items by category, filter vegetarian, add to cart
- **Cart** — Persistent cart via Zustand (localStorage) with live item count badge
- **Stripe Checkout** — Hosted payment page; webhook confirms the order on success
- **Real-time admin dashboard** — New orders appear instantly via Supabase Realtime without polling
- **Order status management** — Admin can move orders through the lifecycle (`confirmed → preparing → ready → completed`)
- **Auth** — Supabase email/password; admin routes protected by Next.js middleware + RLS

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
