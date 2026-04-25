'use strict';
/**
 * BombayLane Demo Server
 * ─────────────────────
 * Self-contained Express server with in-memory data — no MongoDB required.
 *
 * Start:  npm run demo
 *
 * Demo accounts (password: Demo@1234)
 *   user@bombaylane.com    — customer
 *   owner@bombaylane.com   — restaurant_owner
 *   admin@bombaylane.com   — admin
 */

require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const os = require('os');

const PORT = parseInt(process.env.PORT || '5000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-bombaylane';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const DEMO_PASSWORD = 'Demo@1234';
const TAX_RATE = Number(process.env.TAX_RATE || 0.05);
const FREE_DELIVERY_THRESHOLD = Number(process.env.FREE_DELIVERY_THRESHOLD || 15);
const BASE_DELIVERY_FEE = Number(process.env.BASE_DELIVERY_FEE || 2.99);

// ── ID generator ──────────────────────────────────────────────────────────────
let seq = 0;
const newId = () => (++seq).toString(16).padStart(24, '0');

// ── In-memory stores ──────────────────────────────────────────────────────────
const db = {
  users: [],
  restaurants: [],
  menuItems: [],
  orders: [],
  reviews: []
};

// ── Seed demo data ────────────────────────────────────────────────────────────
async function seedData () {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Users
  const adminId = newId();
  const ownerId = newId();
  const customerId = newId();

  db.users.push(
    {
      _id: adminId, name: 'Admin User', email: 'admin@bombaylane.com',
      password: hash, role: 'admin', phone: '9000000001',
      address: 'Admin Office, Mumbai', isDeleted: false, createdAt: new Date()
    },
    {
      _id: ownerId, name: 'Restaurant Owner', email: 'owner@bombaylane.com',
      password: hash, role: 'restaurant_owner', phone: '9000000002',
      address: 'Andheri, Mumbai', isDeleted: false, createdAt: new Date()
    },
    {
      _id: customerId, name: 'Demo Customer', email: 'user@bombaylane.com',
      password: hash, role: 'customer', phone: '9000000003',
      address: '14 Linking Road, Bandra, Mumbai', isDeleted: false, createdAt: new Date()
    }
  );

  // Bombay Lanes — the only restaurant in this demo
  // (based on just-eat.co.uk/restaurants-bombay-lanes-lower-edmonton)
  const r5 = newId();
  db.restaurants.push({
    _id: r5, name: 'Bombay Lanes',
    description: 'Award-winning Indian restaurant in Lower Edmonton serving authentic curries, grills and street food.',
    cuisine: ['North Indian', 'Punjabi', 'Street Food'], owner: ownerId,
    location: { address: '182 Fore Street, Lower Edmonton', city: 'London', coordinates: { lat: 51.62, lng: -0.07 } },
    openingHours: { open: '12:00', close: '23:00' },
    averageRating: 4.6, deliveryTimeMinutes: 40, isOpen: true, isDeleted: false, createdAt: new Date(),
    featured: true,
    image: 'https://picsum.photos/seed/bombay-lanes-hero/800/350'
  });

  // Menu — prices in GBP (£), sourced from just-eat.co.uk/restaurants-bombay-lanes-lower-edmonton
  const items = [
    // Starters
    { restaurant: r5, name: 'Chicken Tikka', description: 'Tender chicken marinated in spiced yogurt, grilled in tandoor', category: 'Starters', price: 6.50, isVegetarian: false, image: 'https://picsum.photos/seed/chicken-tikka/400/250' },
    { restaurant: r5, name: 'Onion Bhaji', description: 'Crispy spiced onion fritters served with mint chutney', category: 'Starters', price: 4.50, isVegetarian: true, image: 'https://picsum.photos/seed/onion-bhaji/400/250' },
    { restaurant: r5, name: 'Seekh Kebab', description: 'Minced lamb kebab with herbs, grilled on skewer', category: 'Starters', price: 6.95, isVegetarian: false, image: 'https://picsum.photos/seed/seekh-kebab/400/250' },
    { restaurant: r5, name: 'Paneer Tikka', description: 'Marinated cottage cheese cubes grilled in tandoor', category: 'Starters', price: 6.50, isVegetarian: true, image: 'https://picsum.photos/seed/paneer-tikka/400/250' },
    { restaurant: r5, name: 'Samosa (2 pcs)', description: 'Crispy pastry filled with spiced potato and peas', category: 'Starters', price: 3.95, isVegetarian: true, image: 'https://picsum.photos/seed/samosa/400/250' },
    { restaurant: r5, name: 'Papdi Chaat', description: 'Crispy wafers topped with yogurt, tamarind and chutneys', category: 'Starters', price: 4.95, isVegetarian: true, image: 'https://picsum.photos/seed/papdi-chaat/400/250' },
    // Mains
    { restaurant: r5, name: 'Lamb Rogan Josh', description: 'Slow-cooked Kashmiri lamb curry with aromatic spices', category: 'Mains', price: 11.95, isVegetarian: false, image: 'https://picsum.photos/seed/rogan-josh/400/250' },
    { restaurant: r5, name: 'Butter Chicken', description: 'Tender chicken in a rich, creamy tomato sauce', category: 'Mains', price: 11.50, isVegetarian: false, image: 'https://picsum.photos/seed/butter-chicken/400/250' },
    { restaurant: r5, name: 'Chicken Balti', description: 'Classic Birmingham-style balti with fresh herbs and spices', category: 'Mains', price: 11.95, isVegetarian: false, image: 'https://picsum.photos/seed/chicken-balti/400/250' },
    { restaurant: r5, name: 'Paneer Butter Masala', description: 'Cottage cheese in silky tomato-cream gravy', category: 'Mains', price: 10.95, isVegetarian: true, image: 'https://picsum.photos/seed/paneer-masala/400/250' },
    { restaurant: r5, name: 'Dal Tadka', description: 'Yellow lentils tempered with cumin and garlic', category: 'Mains', price: 9.50, isVegetarian: true, image: 'https://picsum.photos/seed/dal-tadka/400/250' },
    { restaurant: r5, name: 'Saag Aloo', description: 'Spinach and potato cooked with ginger and cumin', category: 'Mains', price: 9.50, isVegetarian: true, image: 'https://picsum.photos/seed/saag-aloo/400/250' },
    { restaurant: r5, name: 'Lamb Keema Matar', description: 'Minced lamb with garden peas in a rich masala sauce', category: 'Mains', price: 11.95, isVegetarian: false, image: 'https://picsum.photos/seed/keema-matar/400/250' },
    { restaurant: r5, name: 'Chicken Tikka Masala', description: "Britain's favourite — grilled tikka in a velvety masala sauce", category: 'Mains', price: 11.95, isVegetarian: false, image: 'https://picsum.photos/seed/tikka-masala/400/250' },
    { restaurant: r5, name: 'Mixed Vegetable Curry', description: 'Seasonal vegetables in a mild coconut and tomato sauce', category: 'Mains', price: 9.95, isVegetarian: true, image: 'https://picsum.photos/seed/veg-curry/400/250' },
    // Rice & Breads
    { restaurant: r5, name: 'Basmati Pilau Rice', description: 'Fragrant long-grain rice cooked with whole spices', category: 'Rice & Breads', price: 3.50, isVegetarian: true, image: 'https://picsum.photos/seed/pilau-rice/400/250' },
    { restaurant: r5, name: 'Plain Naan', description: 'Soft leavened flatbread baked fresh in tandoor', category: 'Rice & Breads', price: 2.95, isVegetarian: true, image: 'https://picsum.photos/seed/plain-naan/400/250' },
    { restaurant: r5, name: 'Garlic Naan', description: 'Naan brushed with garlic butter and fresh coriander', category: 'Rice & Breads', price: 3.25, isVegetarian: true, image: 'https://picsum.photos/seed/garlic-naan/400/250' },
    { restaurant: r5, name: 'Cheese Naan', description: 'Naan stuffed with melted cheese and herbs', category: 'Rice & Breads', price: 3.95, isVegetarian: true, image: 'https://picsum.photos/seed/cheese-naan/400/250' },
    { restaurant: r5, name: 'Lamb Biryani', description: 'Slow-cooked spiced lamb layered with saffron basmati rice', category: 'Rice & Breads', price: 13.95, isVegetarian: false, image: 'https://picsum.photos/seed/lamb-biryani/400/250' },
    { restaurant: r5, name: 'Chicken Biryani', description: 'Aromatic chicken biryani cooked dum style', category: 'Rice & Breads', price: 12.95, isVegetarian: false, image: 'https://picsum.photos/seed/chicken-biryani/400/250' },
    // Drinks
    { restaurant: r5, name: 'Mango Lassi', description: 'Chilled blended yogurt with Alphonso mango', category: 'Drinks', price: 3.95, isVegetarian: true, image: 'https://picsum.photos/seed/mango-lassi/400/250' },
    { restaurant: r5, name: 'Masala Chai', description: 'Spiced Indian tea with ginger and cardamom', category: 'Drinks', price: 2.50, isVegetarian: true, image: 'https://picsum.photos/seed/masala-chai/400/250' },
    { restaurant: r5, name: 'Rose Sharbat', description: 'Chilled rose-flavoured drink with basil seeds', category: 'Drinks', price: 3.25, isVegetarian: true, image: 'https://picsum.photos/seed/rose-sharbat/400/250' },
    // Desserts
    { restaurant: r5, name: 'Gulab Jamun', description: 'Soft milk-solid dumplings soaked in rose-sugar syrup', category: 'Desserts', price: 4.50, isVegetarian: true, image: 'https://picsum.photos/seed/gulab-jamun/400/250' },
    { restaurant: r5, name: 'Kulfi', description: 'Traditional Indian ice cream — pistachio or mango', category: 'Desserts', price: 4.95, isVegetarian: true, image: 'https://picsum.photos/seed/kulfi/400/250' },
    { restaurant: r5, name: 'Kheer', description: 'Slow-cooked rice pudding with cardamom and saffron', category: 'Desserts', price: 4.50, isVegetarian: true, image: 'https://picsum.photos/seed/kheer/400/250' }
  ];

  items.forEach((item) => {
    db.menuItems.push({ _id: newId(), available: true, isDeleted: false, createdAt: new Date(), ...item });
  });
}

// ── JWT helpers ───────────────────────────────────────────────────────────────
const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
const decodeToken = (token) => jwt.verify(token, JWT_SECRET);

// ── Auth middleware ───────────────────────────────────────────────────────────
const authenticate = (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
    const decoded = decodeToken(token);
    const user = db.users.find((u) => u._id === decoded.id && !u.isDeleted);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  return next();
};

// ── Sanitize user object for responses ───────────────────────────────────────
const safeUser = (u) => {
  const { password: _pw, ...rest } = u; // eslint-disable-line no-unused-vars
  return rest;
};

// ── Build app ─────────────────────────────────────────────────────────────────
const app = express();

app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Allow all origins in demo mode
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (_req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

// Relaxed rate limits for demo
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false }));

// Serve frontend static files
app.use(express.static(path.join(__dirname)));
app.use('/public', express.static(path.join(__dirname, 'public')));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ success: true, status: 'ok', service: 'BombayLane Demo API' }));

// ── Auth routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, address, role } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (db.users.find((u) => u.email === email && !u.isDeleted)) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const allowed = ['customer', 'restaurant_owner'];
    const userRole = allowed.includes(role) ? role : 'customer';
    const hashed = await bcrypt.hash(password, 10);
    const user = {
      _id: newId(), name, email, password: hashed, role: userRole,
      phone: phone || '', address: address || '',
      preferences: { cuisines: [], dietary: [] },
      isDeleted: false, createdAt: new Date()
    };
    db.users.push(user);
    const token = signToken({ id: user._id, role: user.role });
    return res.status(201).json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;
    const user = db.users.find((u) => u.email === email && !u.isDeleted);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = signToken({ id: user._id, role: user.role });
    return res.json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/logout', authenticate, (_req, res) => res.json({ success: true, message: 'Logged out successfully' }));

app.get('/api/auth/me', authenticate, (req, res) => res.json({ success: true, user: safeUser(req.user) }));

app.put('/api/auth/profile', authenticate, (req, res) => {
  const user = db.users.find((u) => u._id === req.user._id);
  if (req.body.name) user.name = req.body.name;
  if (req.body.phone) user.phone = req.body.phone;
  if (req.body.address) user.address = req.body.address;
  if (req.body.preferences) user.preferences = req.body.preferences;
  res.json({ success: true, user: safeUser(user) });
});

// ── User routes ───────────────────────────────────────────────────────────────
app.get('/api/users/me', authenticate, (req, res) => res.json({ success: true, user: safeUser(req.user) }));

app.put('/api/users/me', authenticate, (req, res) => {
  const user = db.users.find((u) => u._id === req.user._id);
  if (typeof req.body.name === 'string') user.name = req.body.name;
  if (typeof req.body.address === 'string') user.address = req.body.address;
  if (typeof req.body.phone === 'string') user.phone = req.body.phone;
  if (req.body.preferences && typeof req.body.preferences === 'object') user.preferences = req.body.preferences;
  res.json({ success: true, user: safeUser(user) });
});

// ── Restaurant routes ─────────────────────────────────────────────────────────
app.get('/api/restaurants', (req, res) => {
  const { cuisine, city, minRating = 0, sort = '-averageRating' } = req.query;
  let list = db.restaurants.filter((r) => !r.isDeleted && r.averageRating >= Number(minRating));
  if (cuisine) list = list.filter((r) => r.cuisine.includes(cuisine));
  if (city) list = list.filter((r) => r.location.city.toLowerCase().includes(String(city).toLowerCase()));

  const sortField = String(sort).replace('-', '');
  const desc = String(sort).startsWith('-');
  list.sort((a, b) => {
    const av = a[sortField] ?? 0;
    const bv = b[sortField] ?? 0;
    return desc ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
  });
  res.json({ success: true, restaurants: list });
});

app.get('/api/restaurants/:id', (req, res) => {
  const restaurant = db.restaurants.find((r) => r._id === req.params.id && !r.isDeleted);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  const owner = db.users.find((u) => u._id === restaurant.owner);
  return res.json({ success: true, restaurant: { ...restaurant, owner: owner ? safeUser(owner) : null } });
});

app.post('/api/restaurants', authenticate, authorize('restaurant_owner', 'admin'), (req, res) => {
  const { name, description, cuisine, location, openingHours, deliveryTimeMinutes } = req.body;
  if (!name || !location?.address || !location?.city) {
    return res.status(400).json({ success: false, message: 'name, location.address and location.city are required' });
  }
  const restaurant = {
    _id: newId(), name, description: description || '', cuisine: cuisine || [],
    owner: req.user._id, location, openingHours: openingHours || { open: '09:00', close: '22:00' },
    averageRating: 0, deliveryTimeMinutes: deliveryTimeMinutes || 30,
    isOpen: true, isDeleted: false, createdAt: new Date()
  };
  db.restaurants.push(restaurant);
  return res.status(201).json({ success: true, restaurant });
});

app.put('/api/restaurants/:id', authenticate, (req, res) => {
  const restaurant = db.restaurants.find((r) => r._id === req.params.id && !r.isDeleted);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  if (restaurant.owner !== req.user._id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  Object.assign(restaurant, req.body, { _id: restaurant._id, owner: restaurant.owner });
  return res.json({ success: true, restaurant });
});

app.delete('/api/restaurants/:id', authenticate, (req, res) => {
  const restaurant = db.restaurants.find((r) => r._id === req.params.id && !r.isDeleted);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  if (restaurant.owner !== req.user._id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  restaurant.isDeleted = true;
  return res.json({ success: true, message: 'Restaurant deleted' });
});

// ── Menu routes ───────────────────────────────────────────────────────────────
app.get('/api/restaurants/:id/menu', (req, res) => {
  const items = db.menuItems.filter((m) => m.restaurant === req.params.id && !m.isDeleted && m.available);
  items.sort((a, b) => (a.category + a.name).localeCompare(b.category + b.name));
  res.json({ success: true, items });
});

app.post('/api/restaurants/:id/menu', authenticate, (req, res) => {
  const restaurant = db.restaurants.find((r) => r._id === req.params.id && !r.isDeleted);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  if (restaurant.owner !== req.user._id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  const { name, price, description, category, isVegetarian } = req.body;
  if (!name || price == null) {
    return res.status(400).json({ success: false, message: 'name and price are required' });
  }
  const item = {
    _id: newId(), restaurant: restaurant._id, name, price: Number(price),
    description: description || '', category: category || 'General',
    isVegetarian: Boolean(isVegetarian), available: true, isDeleted: false, createdAt: new Date()
  };
  db.menuItems.push(item);
  return res.status(201).json({ success: true, item });
});

app.put('/api/menu/:id', authenticate, (req, res) => {
  const item = db.menuItems.find((m) => m._id === req.params.id && !m.isDeleted);
  if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });
  const restaurant = db.restaurants.find((r) => r._id === item.restaurant);
  if (!restaurant || (restaurant.owner !== req.user._id && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  Object.assign(item, req.body, { _id: item._id, restaurant: item.restaurant });
  return res.json({ success: true, item });
});

app.delete('/api/menu/:id', authenticate, (req, res) => {
  const item = db.menuItems.find((m) => m._id === req.params.id && !m.isDeleted);
  if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });
  const restaurant = db.restaurants.find((r) => r._id === item.restaurant);
  if (!restaurant || (restaurant.owner !== req.user._id && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  item.isDeleted = true;
  return res.json({ success: true, message: 'Menu item deleted' });
});

// ── Order routes ──────────────────────────────────────────────────────────────
app.post('/api/orders', authenticate, (req, res) => {
  try {
    const { restaurantId, deliveryAddress, items } = req.body;
    if (!restaurantId || !deliveryAddress || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ success: false, message: 'restaurantId, deliveryAddress and items are required' });
    }
    const restaurant = db.restaurants.find((r) => r._id === restaurantId && !r.isDeleted);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const orderItems = items.map((item) => {
      const menuItem = db.menuItems.find((m) => m._id === item.menuItemId && m.restaurant === restaurantId && !m.isDeleted);
      if (!menuItem) throw new Error('One or more menu items are invalid');
      return { menuItem: menuItem._id, name: menuItem.name, quantity: Number(item.quantity || 1), price: menuItem.price };
    });

    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const tax = Number((subtotal * TAX_RATE).toFixed(2));
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : BASE_DELIVERY_FEE;
    const total = subtotal + tax + deliveryFee;

    const order = {
      _id: newId(), customer: req.user._id, restaurant: restaurantId,
      items: orderItems, subtotal, tax, deliveryFee, total,
      status: 'placed', deliveryAddress,
      estimatedDeliveryAt: new Date(Date.now() + (restaurant.deliveryTimeMinutes || 30) * 60000),
      isDeleted: false, createdAt: new Date()
    };
    db.orders.push(order);
    return res.status(201).json({ success: true, order });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

app.get('/api/orders', authenticate, (req, res) => {
  let orders = db.orders.filter((o) => !o.isDeleted);
  if (req.user.role === 'customer') orders = orders.filter((o) => o.customer === req.user._id);
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, orders });
});

app.get('/api/orders/:id', authenticate, (req, res) => {
  const order = db.orders.find((o) => o._id === req.params.id && !o.isDeleted);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  const restaurant = db.restaurants.find((r) => r._id === order.restaurant);
  const isCustomer = order.customer === req.user._id;
  const isOwner = restaurant && restaurant.owner === req.user._id;
  if (!isCustomer && !isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  return res.json({ success: true, order: { ...order, restaurant } });
});

app.put('/api/orders/:id/status', authenticate, (req, res) => {
  const order = db.orders.find((o) => o._id === req.params.id && !o.isDeleted);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  const restaurant = db.restaurants.find((r) => r._id === order.restaurant);
  const isOwner = restaurant && restaurant.owner === req.user._id;
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only restaurant owner or admin can update status' });
  }
  const validStatuses = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!validStatuses.includes(req.body.status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  order.status = req.body.status;
  return res.json({ success: true, order });
});

// ── Review routes ─────────────────────────────────────────────────────────────
app.post('/api/restaurants/:id/reviews', authenticate, (req, res) => {
  const restaurant = db.restaurants.find((r) => r._id === req.params.id && !r.isDeleted);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

  const rating = Number(req.body.rating);
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
  }

  let review = db.reviews.find((rv) => rv.restaurant === req.params.id && rv.user === req.user._id);
  if (review) {
    review.rating = rating;
    review.comment = req.body.comment || '';
    review.photos = Array.isArray(req.body.photos) ? req.body.photos : [];
  } else {
    review = {
      _id: newId(), restaurant: req.params.id, user: req.user._id,
      rating, comment: req.body.comment || '',
      photos: Array.isArray(req.body.photos) ? req.body.photos : [],
      helpfulVotes: 0, isModerated: true, isDeleted: false, createdAt: new Date()
    };
    db.reviews.push(review);
  }

  // Recalculate average rating
  const restaurantReviews = db.reviews.filter((rv) => rv.restaurant === req.params.id && !rv.isDeleted);
  const avg = restaurantReviews.reduce((sum, rv) => sum + rv.rating, 0) / (restaurantReviews.length || 1);
  restaurant.averageRating = Number(avg.toFixed(2));

  return res.status(201).json({ success: true, review });
});

app.get('/api/restaurants/:id/reviews', (req, res) => {
  const reviews = db.reviews
    .filter((rv) => rv.restaurant === req.params.id && !rv.isDeleted)
    .map((rv) => {
      const user = db.users.find((u) => u._id === rv.user);
      return { ...rv, user: user ? { _id: user._id, name: user.name } : null };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, reviews });
});

// ── Admin routes ─────────────────────────────────────────────────────────────
app.get('/api/admin/users', authenticate, authorize('admin'), (_req, res) => {
  const users = db.users.filter((u) => !u.isDeleted).map(safeUser);
  res.json({ success: true, users });
});

app.delete('/api/admin/users/:id', authenticate, authorize('admin'), (req, res) => {
  const user = db.users.find((u) => u._id === req.params.id && !u.isDeleted);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user._id === req.user._id) return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
  user.isDeleted = true;
  return res.json({ success: true, message: 'User deleted' });
});

// ── Search route ──────────────────────────────────────────────────────────────
app.get('/api/search', (req, res) => {
  const { q = '', cuisine, sort = 'rating' } = req.query;
  const term = String(q).trim().toLowerCase();

  let restaurants = db.restaurants.filter((r) => {
    if (r.isDeleted) return false;
    if (cuisine && !r.cuisine.includes(cuisine)) return false;
    if (term) {
      return r.name.toLowerCase().includes(term) ||
        (r.description || '').toLowerCase().includes(term) ||
        r.location.city.toLowerCase().includes(term);
    }
    return true;
  });

  const sortMap = { rating: '-averageRating', delivery: 'deliveryTimeMinutes', price: 'name', popularity: '-createdAt' };
  const sortKey = String(sortMap[sort] || '-averageRating');
  const field = sortKey.replace('-', '');
  const desc = sortKey.startsWith('-');
  restaurants.sort((a, b) => {
    const av = a[field] ?? 0;
    const bv = b[field] ?? 0;
    return desc ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
  });

  const menuItems = term
    ? db.menuItems.filter((m) => !m.isDeleted && m.name.toLowerCase().includes(term)).slice(0, 50)
    : [];

  res.json({ success: true, restaurants, menuItems });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` }));

// ── Start server ──────────────────────────────────────────────────────────────
seedData().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    const ifaces = os.networkInterfaces();
    let lanIp = '127.0.0.1';
    for (const iface of Object.values(ifaces)) {
      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal) { lanIp = addr.address; break; }
      }
    }
    console.log('');
    console.log('  BombayLane Demo Server');
    console.log('  ─────────────────────────────────────────');
    console.log(`  Local : http://localhost:${PORT}`);
    console.log(`  LAN   : http://${lanIp}:${PORT}`);
    console.log('  ─────────────────────────────────────────');
    console.log('  Demo credentials  (password: Demo@1234)');
    console.log('  user@bombaylane.com   — customer');
    console.log('  owner@bombaylane.com  — restaurant_owner');
    console.log('  admin@bombaylane.com  — admin');
    console.log('  ─────────────────────────────────────────');
    console.log('');
  });
});
