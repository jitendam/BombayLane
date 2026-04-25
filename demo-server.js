'use strict';
/* ─────────────────────────────────────────────────────────────────────────────
   BombayLane  –  self-contained demo server  (no database required)
   All data lives in-memory.  Pre-seeded with restaurants, menu items & users.

   Demo accounts (password: Demo@1234)
     user@bombaylane.com   – customer
     owner@bombaylane.com  – restaurant_owner
     admin@bombaylane.com  – admin
   ───────────────────────────────────────────────────────────────────────────── */

require('dotenv').config();
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const path    = require('path');
const crypto  = require('crypto');

const app        = express();
const PORT       = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'demo-bombaylane-secret-2024';
const TAX_RATE   = 0.05;
const DELIVERY_FEE   = 40;
const FREE_DELIVERY  = 500;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── helpers ─────────────────────────────────────────────────────────────── */
const uid  = () => crypto.randomUUID();
const now  = () => new Date();
const ok   = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const fail = (res, msg, status = 400)  => res.status(status).json({ success: false, message: msg });

const HASH = bcrypt.hashSync('Demo@1234', 10);

/* ── seed data ───────────────────────────────────────────────────────────── */
const DB = {
  users: [
    { id: 'u-admin', name: 'Admin User',        email: 'admin@bombaylane.com',  password: HASH, role: 'admin',            phone: '9000000001', address: 'BombayLane HQ, Mumbai',  createdAt: now() },
    { id: 'u-owner', name: 'Restaurant Owner',  email: 'owner@bombaylane.com',  password: HASH, role: 'restaurant_owner', phone: '9000000002', address: 'Bandra West, Mumbai',    createdAt: now() },
    { id: 'u-demo',  name: 'Demo Customer',     email: 'user@bombaylane.com',   password: HASH, role: 'customer',         phone: '9000000003', address: 'Andheri East, Mumbai',   createdAt: now() },
  ],
  restaurants: [
    { id: 'r1', name: 'Mumbai Spice',    owner: 'u-owner', cuisine: ['North Indian'],          location: { address: '14 Bandra West',   city: 'Mumbai'    }, averageRating: 4.5, deliveryTimeMinutes: 30, isOpen: true,  description: 'Authentic North Indian flavours from the heart of Mumbai.' },
    { id: 'r2', name: 'Delhi Darbar',    owner: 'u-owner', cuisine: ['North Indian','Mughlai'],location: { address: '2 Connaught Place', city: 'Delhi'     }, averageRating: 4.7, deliveryTimeMinutes: 40, isOpen: true,  description: 'Royal Mughlai cuisine with a refined modern touch.' },
    { id: 'r3', name: 'South Bite',      owner: 'u-owner', cuisine: ['South Indian'],          location: { address: '8 Koramangala',    city: 'Bangalore' }, averageRating: 4.3, deliveryTimeMinutes: 25, isOpen: true,  description: 'Crispy dosas and fluffy idlis delivered piping-hot.' },
    { id: 'r4', name: 'Street Food Hub', owner: 'u-owner', cuisine: ['Street Food'],           location: { address: 'Chowpatty Beach',  city: 'Mumbai'    }, averageRating: 4.2, deliveryTimeMinutes: 20, isOpen: false, description: 'Iconic Mumbai street bites brought straight to your door.' },
  ],
  menuItems: [
    // Mumbai Spice
    { id: 'mi1',  restaurant: 'r1', name: 'Butter Chicken',       price: 320, category: 'Main Course', description: 'Creamy tomato-based curry with tender chicken',     isVeg: false, isAvailable: true },
    { id: 'mi2',  restaurant: 'r1', name: 'Paneer Tikka Masala',  price: 280, category: 'Main Course', description: 'Cottage cheese in a rich, spiced gravy',           isVeg: true,  isAvailable: true },
    { id: 'mi3',  restaurant: 'r1', name: 'Dal Makhani',          price: 220, category: 'Main Course', description: 'Slow-cooked black lentils with butter & cream',    isVeg: true,  isAvailable: true },
    { id: 'mi4',  restaurant: 'r1', name: 'Garlic Naan',          price:  50, category: 'Breads',      description: 'Soft leavened bread with garlic butter',           isVeg: true,  isAvailable: true },
    { id: 'mi5',  restaurant: 'r1', name: 'Mango Lassi',          price:  80, category: 'Drinks',      description: 'Chilled yogurt and mango smoothie',                isVeg: true,  isAvailable: true },
    // Delhi Darbar
    { id: 'mi6',  restaurant: 'r2', name: 'Chicken Biryani',      price: 350, category: 'Rice',        description: 'Fragrant basmati with tender chicken pieces',      isVeg: false, isAvailable: true },
    { id: 'mi7',  restaurant: 'r2', name: 'Seekh Kebab',          price: 300, category: 'Starters',    description: 'Spiced minced-meat skewers off the grill',         isVeg: false, isAvailable: true },
    { id: 'mi8',  restaurant: 'r2', name: 'Veg Biryani',          price: 280, category: 'Rice',        description: 'Fragrant rice with seasonal vegetables',          isVeg: true,  isAvailable: true },
    { id: 'mi9',  restaurant: 'r2', name: 'Cucumber Raita',       price:  60, category: 'Sides',       description: 'Cool yogurt dip with cucumber & mint',            isVeg: true,  isAvailable: true },
    { id: 'mi10', restaurant: 'r2', name: 'Shahi Paneer',         price: 260, category: 'Main Course', description: 'Cottage cheese in a royal cashew-cream gravy',    isVeg: true,  isAvailable: true },
    // South Bite
    { id: 'mi11', restaurant: 'r3', name: 'Masala Dosa',          price: 120, category: 'Breakfast',   description: 'Crispy crepe with spiced potato filling',         isVeg: true,  isAvailable: true },
    { id: 'mi12', restaurant: 'r3', name: 'Idli Sambar',          price: 100, category: 'Breakfast',   description: 'Steamed rice cakes served with lentil soup',      isVeg: true,  isAvailable: true },
    { id: 'mi13', restaurant: 'r3', name: 'Uttapam',              price: 130, category: 'Breakfast',   description: 'Thick pancake topped with onions and tomatoes',   isVeg: true,  isAvailable: true },
    { id: 'mi14', restaurant: 'r3', name: 'Filter Coffee',        price:  60, category: 'Drinks',      description: 'Strong, authentic South Indian coffee',           isVeg: true,  isAvailable: true },
    { id: 'mi15', restaurant: 'r3', name: 'Ven Pongal',           price: 110, category: 'Breakfast',   description: 'Savory rice and lentil porridge with ghee',       isVeg: true,  isAvailable: true },
    // Street Food Hub
    { id: 'mi16', restaurant: 'r4', name: 'Pav Bhaji',            price: 120, category: 'Mains',       description: 'Spiced vegetable mash with buttered bread rolls', isVeg: true,  isAvailable: true },
    { id: 'mi17', restaurant: 'r4', name: 'Vada Pav',             price:  40, category: 'Snacks',      description: 'Mumbai\'s beloved street burger',                 isVeg: true,  isAvailable: true },
    { id: 'mi18', restaurant: 'r4', name: 'Bhel Puri',            price:  70, category: 'Snacks',      description: 'Puffed rice tossed with chutneys & veggies',      isVeg: true,  isAvailable: true },
    { id: 'mi19', restaurant: 'r4', name: 'Sev Puri',             price:  80, category: 'Snacks',      description: 'Crispy wafers loaded with toppings',              isVeg: true,  isAvailable: true },
    { id: 'mi20', restaurant: 'r4', name: 'Kulfi Falooda',        price:  90, category: 'Desserts',    description: 'Traditional Indian ice-cream with rose milk',     isVeg: true,  isAvailable: true },
  ],
  orders:  [],
  reviews: [],
};

/* ── auth middleware ─────────────────────────────────────────────────────── */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return fail(res, 'Authentication required', 401);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user    = DB.users.find((u) => u.id === payload.id);
    if (!user) return fail(res, 'User not found', 401);
    req.user = user;
    next();
  } catch {
    fail(res, 'Invalid or expired token', 401);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return fail(res, 'Forbidden', 403);
    next();
  };
}

/* ── utils ───────────────────────────────────────────────────────────────── */
const safeUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, address: u.address });

/* ═══════════════════════════════════════════════════════════════════════════
   API routes
   ═══════════════════════════════════════════════════════════════════════════ */

/* health */
app.get('/health', (_req, res) => ok(res, { status: 'ok', service: 'BombayLane Demo API', mode: 'in-memory' }));

/* ── auth ─────────────────────────────────────────────────────────────────── */
app.post('/api/auth/login', async (req, res) => {
  const email    = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user     = DB.users.find((u) => u.email === email);
  if (!user) return fail(res, 'Invalid credentials', 401);
  const match = await bcrypt.compare(password, user.password);
  if (!match) return fail(res, 'Invalid credentials', 401);
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  ok(res, { token, user: safeUser(user) });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, role, phone, address } = req.body;
  const email    = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!name || !email || !password) return fail(res, 'Name, email and password are required');
  if (DB.users.find((u) => u.email === email)) return fail(res, 'Email already in use', 409);
  const hash = await bcrypt.hash(password, 10);
  const user = { id: uid(), name, email, password: hash, role: role || 'customer', phone: phone || '', address: address || '', createdAt: now() };
  DB.users.push(user);
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  ok(res, { token, user: safeUser(user) }, 201);
});

app.get('/api/auth/me', authenticate, (req, res) => ok(res, { user: safeUser(req.user) }));

app.post('/api/auth/logout', authenticate, (_req, res) => ok(res, { message: 'Logged out' }));

app.put('/api/auth/profile', authenticate, (req, res) => {
  const user = DB.users.find((u) => u.id === req.user.id);
  if (req.body.name)    user.name    = req.body.name;
  if (req.body.phone)   user.phone   = req.body.phone;
  if (req.body.address) user.address = req.body.address;
  ok(res, { user: safeUser(user) });
});

/* ── restaurants ─────────────────────────────────────────────────────────── */
app.get('/api/restaurants', (req, res) => {
  let list = [...DB.restaurants];
  const { cuisine, city, q } = req.query;
  if (cuisine) list = list.filter((r) => r.cuisine.some((c) => c.toLowerCase().includes(cuisine.toLowerCase())));
  if (city)    list = list.filter((r) => r.location.city.toLowerCase().includes(city.toLowerCase()));
  if (q)       list = list.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) || r.cuisine.join(' ').toLowerCase().includes(q.toLowerCase()));
  list.sort((a, b) => b.averageRating - a.averageRating);
  ok(res, { restaurants: list });
});

app.get('/api/restaurants/:id', (req, res) => {
  const r = DB.restaurants.find((x) => x.id === req.params.id);
  if (!r) return fail(res, 'Restaurant not found', 404);
  const owner = DB.users.find((u) => u.id === r.owner);
  ok(res, { restaurant: { ...r, owner: owner ? safeUser(owner) : null } });
});

app.post('/api/restaurants', authenticate, authorize('restaurant_owner', 'admin'), (req, res) => {
  const r = { id: uid(), owner: req.user.id, averageRating: 0, ...req.body, createdAt: now() };
  DB.restaurants.push(r);
  ok(res, { restaurant: r }, 201);
});

app.put('/api/restaurants/:id', authenticate, (req, res) => {
  const r = DB.restaurants.find((x) => x.id === req.params.id);
  if (!r) return fail(res, 'Restaurant not found', 404);
  if (r.owner !== req.user.id && req.user.role !== 'admin') return fail(res, 'Forbidden', 403);
  Object.assign(r, req.body);
  ok(res, { restaurant: r });
});

app.delete('/api/restaurants/:id', authenticate, (req, res) => {
  const idx = DB.restaurants.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return fail(res, 'Restaurant not found', 404);
  if (DB.restaurants[idx].owner !== req.user.id && req.user.role !== 'admin') return fail(res, 'Forbidden', 403);
  DB.restaurants.splice(idx, 1);
  ok(res, { message: 'Deleted' });
});

/* ── menu ────────────────────────────────────────────────────────────────── */
app.get('/api/restaurants/:id/menu', (req, res) => {
  const items = DB.menuItems.filter((m) => m.restaurant === req.params.id && m.isAvailable);
  ok(res, { items });
});

app.post('/api/restaurants/:id/menu', authenticate, authorize('restaurant_owner', 'admin'), (req, res) => {
  const r = DB.restaurants.find((x) => x.id === req.params.id);
  if (!r) return fail(res, 'Restaurant not found', 404);
  if (r.owner !== req.user.id && req.user.role !== 'admin') return fail(res, 'Forbidden', 403);
  const item = { id: uid(), restaurant: req.params.id, isAvailable: true, ...req.body, createdAt: now() };
  DB.menuItems.push(item);
  ok(res, { item }, 201);
});

app.put('/api/menu/:itemId', authenticate, (req, res) => {
  const item = DB.menuItems.find((m) => m.id === req.params.itemId);
  if (!item) return fail(res, 'Item not found', 404);
  Object.assign(item, req.body);
  ok(res, { item });
});

app.delete('/api/menu/:itemId', authenticate, (req, res) => {
  const idx = DB.menuItems.findIndex((m) => m.id === req.params.itemId);
  if (idx === -1) return fail(res, 'Item not found', 404);
  DB.menuItems.splice(idx, 1);
  ok(res, { message: 'Deleted' });
});

/* ── orders ──────────────────────────────────────────────────────────────── */
const STATUS_FLOW = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

app.post('/api/orders', authenticate, (req, res) => {
  const { restaurantId, items, deliveryAddress } = req.body;
  if (!restaurantId || !items?.length || !deliveryAddress) return fail(res, 'restaurantId, items and deliveryAddress are required');

  const restaurant = DB.restaurants.find((r) => r.id === restaurantId);
  if (!restaurant) return fail(res, 'Restaurant not found', 404);

  const orderItems = [];
  for (const reqItem of items) {
    const mi = DB.menuItems.find((m) => m.id === reqItem.menuItemId && m.restaurant === restaurantId);
    if (!mi) return fail(res, `Menu item ${reqItem.menuItemId} not found`);
    orderItems.push({ menuItemId: mi.id, name: mi.name, price: mi.price, quantity: Number(reqItem.quantity) || 1 });
  }

  const subtotal    = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax         = Number((subtotal * TAX_RATE).toFixed(2));
  const deliveryFee = subtotal >= FREE_DELIVERY ? 0 : DELIVERY_FEE;
  const total       = subtotal + tax + deliveryFee;

  const order = {
    id: uid(),
    customer: req.user.id,
    customerName: req.user.name,
    restaurant: restaurantId,
    restaurantName: restaurant.name,
    items: orderItems,
    subtotal,
    tax,
    deliveryFee,
    total,
    deliveryAddress,
    status: 'placed',
    statusHistory: [{ status: 'placed', at: now() }],
    estimatedDeliveryAt: new Date(Date.now() + (restaurant.deliveryTimeMinutes || 30) * 60_000),
    createdAt: now(),
  };
  DB.orders.unshift(order);

  /* auto-advance status every 30 s for demo */
  let step = 0;
  const advance = setInterval(() => {
    step += 1;
    if (step >= STATUS_FLOW.length) { clearInterval(advance); return; }
    const o = DB.orders.find((x) => x.id === order.id);
    if (o && o.status !== 'cancelled') {
      o.status = STATUS_FLOW[step];
      o.statusHistory.push({ status: STATUS_FLOW[step], at: now() });
    } else {
      clearInterval(advance);
    }
  }, 30_000);

  ok(res, { order }, 201);
});

app.get('/api/orders', authenticate, (req, res) => {
  let list = DB.orders;
  if (req.user.role === 'customer') list = list.filter((o) => o.customer === req.user.id);
  if (req.user.role === 'restaurant_owner') {
    const owned = DB.restaurants.filter((r) => r.owner === req.user.id).map((r) => r.id);
    list = list.filter((o) => owned.includes(o.restaurant));
  }
  ok(res, { orders: list });
});

app.get('/api/orders/:id', authenticate, (req, res) => {
  const order = DB.orders.find((o) => o.id === req.params.id);
  if (!order) return fail(res, 'Order not found', 404);
  const isCustomer = order.customer === req.user.id;
  const ownedR = DB.restaurants.filter((r) => r.owner === req.user.id).map((r) => r.id);
  const isOwner = ownedR.includes(order.restaurant);
  if (!(isCustomer || isOwner || req.user.role === 'admin')) return fail(res, 'Forbidden', 403);
  ok(res, { order });
});

app.put('/api/orders/:id/status', authenticate, (req, res) => {
  const order = DB.orders.find((o) => o.id === req.params.id);
  if (!order) return fail(res, 'Order not found', 404);
  const ownedR = DB.restaurants.filter((r) => r.owner === req.user.id).map((r) => r.id);
  if (!ownedR.includes(order.restaurant) && req.user.role !== 'admin') return fail(res, 'Forbidden', 403);
  const valid = [...STATUS_FLOW, 'cancelled'];
  if (!valid.includes(req.body.status)) return fail(res, 'Invalid status');
  order.status = req.body.status;
  order.statusHistory.push({ status: req.body.status, at: now() });
  ok(res, { order });
});

app.put('/api/orders/:id/cancel', authenticate, (req, res) => {
  const order = DB.orders.find((o) => o.id === req.params.id);
  if (!order) return fail(res, 'Order not found', 404);
  if (order.customer !== req.user.id && req.user.role !== 'admin') return fail(res, 'Forbidden', 403);
  if (['delivered', 'cancelled'].includes(order.status)) return fail(res, 'Cannot cancel order in current state');
  order.status = 'cancelled';
  order.statusHistory.push({ status: 'cancelled', at: now() });
  ok(res, { order });
});

/* ── reviews ─────────────────────────────────────────────────────────────── */
app.get('/api/restaurants/:id/reviews', (req, res) => {
  const reviews = DB.reviews.filter((r) => r.restaurant === req.params.id);
  ok(res, { reviews });
});

app.post('/api/restaurants/:id/reviews', authenticate, (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) return fail(res, 'Rating must be 1-5');
  const r = DB.restaurants.find((x) => x.id === req.params.id);
  if (!r) return fail(res, 'Restaurant not found', 404);
  const review = { id: uid(), restaurant: req.params.id, user: req.user.id, userName: req.user.name, rating: Number(rating), comment: comment || '', createdAt: now() };
  DB.reviews.push(review);
  /* update restaurant average */
  const allR = DB.reviews.filter((x) => x.restaurant === req.params.id);
  r.averageRating = Number((allR.reduce((s, x) => s + x.rating, 0) / allR.length).toFixed(1));
  ok(res, { review }, 201);
});

/* ── search ──────────────────────────────────────────────────────────────── */
app.get('/api/search', (req, res) => {
  const q       = String(req.query.q || '').toLowerCase();
  const cuisine = String(req.query.cuisine || '').toLowerCase();
  let list = DB.restaurants;
  if (q)       list = list.filter((r) => r.name.toLowerCase().includes(q) || r.cuisine.join(' ').toLowerCase().includes(q) || r.location.city.toLowerCase().includes(q));
  if (cuisine) list = list.filter((r) => r.cuisine.some((c) => c.toLowerCase().includes(cuisine)));
  ok(res, { restaurants: list });
});

/* ── admin endpoints ─────────────────────────────────────────────────────── */
app.get('/api/admin/stats', authenticate, authorize('admin'), (_req, res) => {
  const totalRevenue = DB.orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  ok(res, {
    stats: {
      users:       DB.users.length,
      restaurants: DB.restaurants.length,
      orders:      DB.orders.length,
      revenue:     Number(totalRevenue.toFixed(2)),
    }
  });
});

app.get('/api/admin/users', authenticate, authorize('admin'), (_req, res) => {
  ok(res, { users: DB.users.map(safeUser) });
});

/* ── serve static frontend ───────────────────────────────────────────────── */
app.use(express.static(path.join(__dirname)));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  next();
});

/* ── start ───────────────────────────────────────────────────────────────── */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🍛  BombayLane Demo running → http://localhost:${PORT}`);
    console.log('    Demo credentials (password: Demo@1234)');
    console.log('      👤  user@bombaylane.com   (customer)');
    console.log('      👨‍🍳  owner@bombaylane.com  (restaurant_owner)');
    console.log('      👑  admin@bombaylane.com  (admin)\n');
  });
}

module.exports = app;
