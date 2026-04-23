# BombayLane Food Ordering Platform

BombayLane is a full-stack food ordering platform with secure authentication, restaurant/menu management, cart and checkout flows, order tracking, and review support.

## Tech Stack
- **Backend:** Node.js, Express, MongoDB/Mongoose
- **Security:** Helmet, CORS, rate limiting, input validation, sanitization
- **Frontend:** HTML, CSS, vanilla JavaScript (mobile-first responsive UI)

## Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment template and configure secrets:
   ```bash
   cp .env.example .env
   ```
3. Seed the database with demo data:
   ```bash
   npm run seed
   ```
4. Start server:
   ```bash
   npm run dev
   ```
5. Open **http://localhost:5000** in your browser.

## Demo Credentials

| Role               | Email                     | Password      |
|--------------------|---------------------------|---------------|
| Admin              | admin@bombaylane.com      | Admin@1234!   |
| Restaurant Owner   | owner@bombaylane.com      | Owner@1234!   |
| Customer           | demo@bombaylane.com       | Demo@1234!    |

## Demo Data

The seed script creates:
- **4 restaurants** – Spice Gardens (Mumbai), Dosa Corner (Mumbai), Street Bites (Pune), The Curry House (Delhi)
- **20 menu items** across cuisines (North Indian, South Indian, Street Food, Mughlai)
- **3 demo users** (admin, restaurant owner, customer)

## API Overview
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `GET /api/users/me`
- `PUT /api/users/me`
- `GET /api/restaurants`
- `GET /api/restaurants/:id`
- `POST /api/restaurants`
- `PUT /api/restaurants/:id`
- `DELETE /api/restaurants/:id`
- `GET /api/restaurants/:id/menu`
- `POST /api/restaurants/:id/menu`
- `PUT /api/menu/:id`
- `DELETE /api/menu/:id`
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:id`
- `PUT /api/orders/:id/status`
- `POST /api/restaurants/:id/reviews`
- `GET /api/restaurants/:id/reviews`
- `GET /api/search`
- `GET /health`

## Frontend Pages
- `/index.html` – Home / landing page
- `/pages/restaurants.html` – Browse restaurants
- `/pages/restaurant-detail.html?id=<id>` – Menu + add to cart
- `/pages/cart.html` – Cart summary
- `/pages/checkout.html` – Place order
- `/pages/orders.html` – Order history + live tracking
- `/pages/profile.html` – User profile
- `/pages/auth.html` – Login / Register
- `/admin/index.html` – Admin dashboard (admin role required)
- `/admin/restaurants.html` – Restaurant management
- `/admin/orders.html` – Order monitoring
- `/admin/users.html` – User list
