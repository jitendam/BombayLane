# BombayLane Food Ordering Platform

BombayLane is a full-stack food ordering platform inspired by [Bombay Lanes Lower Edmonton](https://www.just-eat.co.uk/restaurants-bombay-lanes-lower-edmonton/menu). It features secure authentication, restaurant/menu management, cart with multi-restaurant protection, smooth checkout flow, live order tracking, reviews, and a full admin dashboard.

## Tech Stack
- **Backend:** Node.js, Express (production: MongoDB/Mongoose; demo: in-memory)
- **Security:** Helmet, CORS, rate limiting, JWT, input validation
- **Frontend:** HTML5, CSS3 (dark mode), vanilla JavaScript (mobile-first responsive UI)

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

The demo server pre-seeds **5 restaurants** (including Bombay Lanes with 27 real menu items) and **47 menu items**. All data is held in memory — restarting the server resets it to the original seed data.

### Demo Flow

1. **Browse** → `/pages/restaurants.html` — search and filter restaurants
2. **Menu** → Click "View Menu" on any restaurant — add items to cart
3. **Cart** → `/pages/cart.html` — adjust quantities, proceed to checkout
4. **Checkout** → `/pages/checkout.html` — address auto-filled from profile; place order
5. **Orders** → `/pages/orders.html` — view order history with live status tracker
6. **Profile** → `/pages/profile.html` — edit name, phone, default address
7. **Admin** → `/admin/` — dashboard, order management, restaurant toggle, user management

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

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET  /api/auth/me`
- `PUT  /api/auth/profile`

### Restaurants
- `GET    /api/restaurants`
- `GET    /api/restaurants/:id`
- `POST   /api/restaurants`
- `PUT    /api/restaurants/:id`
- `DELETE /api/restaurants/:id`

### Menu
- `GET    /api/restaurants/:id/menu`
- `POST   /api/restaurants/:id/menu`
- `PUT    /api/menu/:id`
- `DELETE /api/menu/:id`

### Orders
- `POST /api/orders`
- `GET  /api/orders`
- `GET  /api/orders/:id`
- `PUT  /api/orders/:id/status`

### Reviews
- `POST /api/restaurants/:id/reviews`
- `GET  /api/restaurants/:id/reviews`

### Search
- `GET /api/search`

### Admin
- `GET    /api/admin/users`
- `DELETE /api/admin/users/:id`

## Frontend Pages

| Page | Path |
|---|---|
| Home | `/index.html` |
| Restaurants | `/pages/restaurants.html` |
| Restaurant Detail + Menu | `/pages/restaurant-detail.html` |
| Cart | `/pages/cart.html` |
| Checkout | `/pages/checkout.html` |
| Orders & Tracking | `/pages/orders.html` |
| Profile | `/pages/profile.html` |
| Login / Register | `/pages/auth.html` |
| Admin Dashboard | `/admin/index.html` |
| Admin Orders | `/admin/orders.html` |
| Admin Restaurants | `/admin/restaurants.html` |
| Admin Users | `/admin/users.html` |
