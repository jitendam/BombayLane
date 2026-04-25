# BombayLane Food Ordering Platform

BombayLane is a full-stack food ordering platform with secure authentication, restaurant/menu management, cart and checkout flows, order tracking, and review support.

## Tech Stack
- **Backend:** Node.js, Express, MongoDB/Mongoose (production) / in-memory (demo)
- **Security:** Helmet, CORS, rate limiting, input validation, sanitization
- **Frontend:** HTML, CSS, vanilla JavaScript (mobile-first responsive UI)

## 🚀 Demo Quick Start (no database required)

```bash
npm install
npm run demo
```

Open **http://localhost:5000** in your browser.

### Demo Accounts (password: `Demo@1234`)

| Email | Role |
|---|---|
| `user@bombaylane.com` | Customer |
| `owner@bombaylane.com` | Restaurant Owner |
| `admin@bombaylane.com` | Admin |

The demo server starts with 4 pre-seeded restaurants and 21 menu items. All data is held in memory — restarting the server resets it to the original seed data.

---

## Production Setup (MongoDB required)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment template and configure secrets:
   ```bash
   cp .env.example .env
   ```
3. Start server:
   ```bash
   npm run dev
   ```

## API Overview
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
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

## Frontend Pages
- `/index.html`
- `/pages/restaurants.html`
- `/pages/restaurant-detail.html`
- `/pages/cart.html`
- `/pages/checkout.html`
- `/pages/profile.html`
- `/pages/orders.html`
- `/pages/auth.html`
- `/admin/index.html`
