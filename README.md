# BombayLane Food Ordering Platform

BombayLane is a full-stack food ordering demo platform — fully functional, **no database required**. Everything runs in-memory so it works on any cloud hosting with zero config.

## 🚀 Live Demo

Deploy in one click to **Render.com** (free tier):

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

Or clone and run locally:
```bash
npm install
npm start          # starts demo-server.js (no DB needed)
```

Open http://localhost:5000

## 🎯 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| 👤 Customer | user@bombaylane.com | Demo@1234 |
| 👨‍🍳 Restaurant Owner | owner@bombaylane.com | Demo@1234 |
| 👑 Admin | admin@bombaylane.com | Demo@1234 |

All credentials are shown on the login page with **one-click auto-fill**.

## ✨ Features

- **Browse restaurants** — filter by cuisine, search by name/city, sort by rating or delivery time
- **Restaurant menus** — grouped by category, veg/non-veg badges, quantity controls
- **Cart** — persistent (localStorage), totals with tax & delivery fee
- **Checkout** — delivery address, order confirmation
- **Live order tracking** — auto-advancing status stepper (placed → confirmed → preparing → on the way → delivered every 30 s)
- **Order history** — reorder, cancel, track any past order
- **User profiles** — view and edit name, phone, address
- **Admin dashboard** — stats cards, manage orders/users/restaurants
- **Dark mode** — automatic or manual toggle
- **Responsive** — works on mobile and desktop

## 🏗️ Architecture

| Layer | Tech |
|-------|------|
| Backend (demo) | `demo-server.js` — Express + in-memory store |
| Backend (prod) | `server.js` — Express + MongoDB/Mongoose |
| Frontend | Vanilla HTML + CSS + JavaScript (multi-page) |
| Auth | JWT (jsonwebtoken) |
| Password hashing | bcryptjs |

## ☁️ Cloud Deployment

### Render.com (recommended — free)
1. Fork this repo
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your fork — Render will auto-detect `render.yaml`
4. Click **Deploy** — no env vars needed

### Railway / Fly.io / Heroku
Set `npm start` as the start command. No environment variables are required for the demo.

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| GET | `/api/auth/me` | Current user |
| PUT | `/api/auth/profile` | Update profile |
| GET | `/api/restaurants` | List restaurants |
| GET | `/api/restaurants/:id` | Restaurant detail |
| GET | `/api/restaurants/:id/menu` | Menu items |
| POST | `/api/orders` | Place order |
| GET | `/api/orders` | Order history |
| GET | `/api/orders/:id` | Order detail |
| PUT | `/api/orders/:id/status` | Update status (owner/admin) |
| PUT | `/api/orders/:id/cancel` | Cancel order |
| POST | `/api/restaurants/:id/reviews` | Post review |
| GET | `/api/search` | Search restaurants |
| GET | `/api/admin/stats` | Admin stats |
| GET | `/api/admin/users` | All users (admin) |

## Development with MongoDB

To run with a real database:
```bash
cp .env.example .env   # set MONGODB_URI
npm run dev            # starts server.js with MongoDB
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
