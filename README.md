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
