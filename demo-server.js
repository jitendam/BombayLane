/**
 * demo-server.js
 *
 * Self-contained demo server for BombayLane.
 * Runs entirely in-memory – no MongoDB required.
 *
 * Start with:  npm run demo
 * Then open:   http://localhost:5000
 *
 * Demo credentials:
 *   Customer:   demo@bombaylane.com   /  Demo@1234!
 *   Owner:      owner@bombaylane.com  /  Owner@1234!
 *   Admin:      admin@bombaylane.com  /  Admin@1234!
 */

require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const morgan = require('morgan');

const app = express();
const SECRET = process.env.JWT_SECRET || 'demo_secret_key_change_in_prod';
const PORT = process.env.PORT || 5000;
const BCRYPT_ROUNDS = 10; // lower for speed in demo

/* ────────────────────────────────────────────────────────────────
   In-memory data store
──────────────────────────────────────────────────────────────── */
let nextId = 1;
const newId = () => String(nextId++).padStart(24, '0');

const db = {
  users: [],
  restaurants: [],
  menuItems: [],
  orders: [],
  reviews: []
};

/* ────────────────────────────────────────────────────────────────
   Seed demo data (synchronous – runs before server starts)
──────────────────────────────────────────────────────────────── */
async function seedDemoData() {
  const adminId = newId();
  const ownerId = newId();
  const customerId = newId();

  db.users.push(
    { _id: adminId, id: adminId, name: 'Admin', email: 'admin@bombaylane.com', password: await bcrypt.hash('Admin@1234!', BCRYPT_ROUNDS), role: 'admin', isDeleted: false },
    { _id: ownerId, id: ownerId, name: 'Raj Sharma', email: 'owner@bombaylane.com', password: await bcrypt.hash('Owner@1234!', BCRYPT_ROUNDS), role: 'restaurant_owner', phone: '9988776655', isDeleted: false },
    { _id: customerId, id: customerId, name: 'Priya Demo', email: 'demo@bombaylane.com', password: await bcrypt.hash('Demo@1234!', BCRYPT_ROUNDS), role: 'customer', phone: '9876543210', address: '42 MG Road, Bandra West, Mumbai 400050', isDeleted: false }
  );

  const spiceId = newId();
  const dosaId = newId();
  const streetId = newId();
  const curryId = newId();

  db.restaurants.push(
    { _id: spiceId, name: 'Spice Gardens', description: 'Authentic North Indian cuisine with rich gravies and tandoor specialties.', cuisine: ['North Indian'], owner: ownerId, location: { address: '12 Bandra West, Near Hill Road', city: 'Mumbai' }, averageRating: 4.5, deliveryTimeMinutes: 30, isOpen: true, isDeleted: false, createdAt: new Date() },
    { _id: dosaId, name: 'Dosa Corner', description: 'Classic South Indian breakfast and meals – crispy dosas and fluffy idlis.', cuisine: ['South Indian'], owner: ownerId, location: { address: '7 Matunga East, Near Station', city: 'Mumbai' }, averageRating: 4.3, deliveryTimeMinutes: 25, isOpen: true, isDeleted: false, createdAt: new Date() },
    { _id: streetId, name: 'Street Bites', description: 'Mumbai street food favorites – vada pav, pav bhaji and more!', cuisine: ['Street Food'], owner: ownerId, location: { address: '5 FC Road, Shivaji Nagar', city: 'Pune' }, averageRating: 4.1, deliveryTimeMinutes: 20, isOpen: true, isDeleted: false, createdAt: new Date() },
    { _id: curryId, name: 'The Curry House', description: 'Mughlai and North Indian delicacies – biryanis, kebabs, and more.', cuisine: ['North Indian', 'Mughlai'], owner: ownerId, location: { address: '34 Connaught Place', city: 'Delhi' }, averageRating: 4.7, deliveryTimeMinutes: 40, isOpen: true, isDeleted: false, createdAt: new Date() }
  );

  const menuData = [
    // Spice Gardens
    { restaurant: spiceId, name: 'Butter Chicken', description: 'Tender chicken in a creamy tomato sauce.', category: 'Main Course', price: 320, isVegetarian: false },
    { restaurant: spiceId, name: 'Dal Makhani', description: 'Slow-cooked black lentils with butter and cream.', category: 'Main Course', price: 260, isVegetarian: true },
    { restaurant: spiceId, name: 'Garlic Naan', description: 'Soft leavened bread with garlic butter.', category: 'Breads', price: 60, isVegetarian: true },
    { restaurant: spiceId, name: 'Chicken Biryani', description: 'Fragrant basmati rice layered with spiced chicken.', category: 'Rice', price: 380, isVegetarian: false },
    { restaurant: spiceId, name: 'Gulab Jamun', description: 'Soft milk-solid dumplings soaked in rose syrup.', category: 'Desserts', price: 120, isVegetarian: true },
    // Dosa Corner
    { restaurant: dosaId, name: 'Masala Dosa', description: 'Crispy rice crepe filled with spiced potato.', category: 'Main', price: 140, isVegetarian: true },
    { restaurant: dosaId, name: 'Idli Sambar', description: 'Steamed rice cakes with lentil soup and chutneys.', category: 'Main', price: 100, isVegetarian: true },
    { restaurant: dosaId, name: 'Medu Vada', description: 'Crunchy lentil fritters with coconut chutney.', category: 'Starters', price: 80, isVegetarian: true },
    { restaurant: dosaId, name: 'Filter Coffee', description: 'South Indian drip coffee – decoction and hot milk.', category: 'Beverages', price: 50, isVegetarian: true },
    { restaurant: dosaId, name: 'Uttapam', description: 'Thick rice pancake topped with onions and tomato.', category: 'Main', price: 120, isVegetarian: true },
    // Street Bites
    { restaurant: streetId, name: 'Vada Pav', description: "Mumbai's iconic fried potato patty in a bun.", category: 'Snacks', price: 40, isVegetarian: true },
    { restaurant: streetId, name: 'Pav Bhaji', description: 'Spiced mashed vegetables with buttered bread rolls.', category: 'Main', price: 130, isVegetarian: true },
    { restaurant: streetId, name: 'Bhel Puri', description: 'Puffed rice tossed with chutneys and vegetables.', category: 'Snacks', price: 70, isVegetarian: true },
    { restaurant: streetId, name: 'Sev Puri', description: 'Crispy puris topped with potatoes, sev, and chutneys.', category: 'Snacks', price: 80, isVegetarian: true },
    { restaurant: streetId, name: 'Misal Pav', description: 'Spicy sprouted lentil curry with bread rolls.', category: 'Main', price: 110, isVegetarian: true },
    // The Curry House
    { restaurant: curryId, name: 'Paneer Tikka', description: 'Chargrilled cottage cheese marinated in spices.', category: 'Starters', price: 290, isVegetarian: true },
    { restaurant: curryId, name: 'Mutton Biryani', description: 'Slow-dum cooked mutton with fragrant basmati rice.', category: 'Rice', price: 490, isVegetarian: false },
    { restaurant: curryId, name: 'Seekh Kebab', description: 'Minced lamb kebabs grilled on skewers.', category: 'Starters', price: 360, isVegetarian: false },
    { restaurant: curryId, name: 'Rumali Roti', description: 'Thin handkerchief-style flatbread.', category: 'Breads', price: 50, isVegetarian: true },
    { restaurant: curryId, name: 'Shahi Kheer', description: 'Royal rice pudding with nuts and saffron.', category: 'Desserts', price: 150, isVegetarian: true }
  ];

  menuData.forEach((item) => {
    const id = newId();
    db.menuItems.push({ ...item, _id: id, id, available: true, isDeleted: false, createdAt: new Date() });
  });
}

/* ────────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────────── */
const safeUser = (u) => ({ _id: u._id, id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone || '', address: u.address || '' });

const issueToken = (user) => jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: '7d' });

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
  try {
    const decoded = jwt.verify(token, SECRET);
    const user = db.users.find((u) => u._id === decoded.id && !u.isDeleted);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const TAX_RATE = Number(process.env.TAX_RATE || 0.05);
const FREE_DELIVERY = Number(process.env.FREE_DELIVERY_THRESHOLD || 500);
const DELIVERY_FEE = Number(process.env.BASE_DELIVERY_FEE || 40);

/* ────────────────────────────────────────────────────────────────
   Middleware
──────────────────────────────────────────────────────────────── */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Relaxed security for demo (no strict CSP so inline scripts work)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use(express.static(path.join(__dirname)));
app.use('/public', express.static(path.join(__dirname, 'public')));

/* ────────────────────────────────────────────────────────────────
   Health
──────────────────────────────────────────────────────────────── */
app.get('/health', (_req, res) => res.json({ success: true, status: 'ok', service: 'BombayLane Demo API' }));

/* ────────────────────────────────────────────────────────────────
   Auth routes
──────────────────────────────────────────────────────────────── */
app.post('/api/auth/register', async (req, res) => {
  const { name, password, role = 'customer', phone, address } = req.body;
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
  if (db.users.find((u) => u.email === email && !u.isDeleted)) {
    return res.status(409).json({ success: false, message: 'Email already in use' });
  }
  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = newId();
  const user = { _id: id, id, name, email, password: hashed, role, phone: phone || '', address: address || '', isDeleted: false };
  db.users.push(user);
  const token = issueToken(user);
  return res.status(201).json({ success: true, token, user: safeUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const { password } = req.body;
  const user = db.users.find((u) => u.email === email && !u.isDeleted);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  const token = issueToken(user);
  return res.json({ success: true, token, user: safeUser(user) });
});

app.post('/api/auth/logout', authenticate, (_req, res) => res.json({ success: true, message: 'Logged out' }));
app.get('/api/auth/me', authenticate, (req, res) => res.json({ success: true, user: safeUser(req.user) }));

app.put('/api/auth/profile', authenticate, (req, res) => {
  const user = db.users.find((u) => u._id === req.user._id);
  if (req.body.name) user.name = req.body.name;
  if (req.body.phone) user.phone = req.body.phone;
  if (req.body.address) user.address = req.body.address;
  return res.json({ success: true, user: safeUser(user) });
});

/* ────────────────────────────────────────────────────────────────
   User routes
──────────────────────────────────────────────────────────────── */
app.get('/api/users/me', authenticate, (req, res) => res.json({ success: true, user: safeUser(req.user) }));

app.put('/api/users/me', authenticate, (req, res) => {
  const user = db.users.find((u) => u._id === req.user._id);
  if (typeof req.body.name === 'string') user.name = req.body.name;
  if (typeof req.body.phone === 'string') user.phone = req.body.phone;
  if (typeof req.body.address === 'string') user.address = req.body.address;
  return res.json({ success: true, user: safeUser(user) });
});

app.get('/api/users', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  const users = db.users.filter((u) => !u.isDeleted).map(safeUser);
  return res.json({ success: true, users });
});

/* ────────────────────────────────────────────────────────────────
   Restaurant routes
──────────────────────────────────────────────────────────────── */
app.get('/api/restaurants', (req, res) => {
  const { cuisine, city, minRating = 0 } = req.query;
  let results = db.restaurants.filter((r) => !r.isDeleted && r.averageRating >= Number(minRating));
  if (cuisine) results = results.filter((r) => r.cuisine.includes(cuisine));
  if (city) results = results.filter((r) => r.location.city.toLowerCase().includes(city.toLowerCase()));
  results = [...results].sort((a, b) => b.averageRating - a.averageRating);
  return res.json({ success: true, restaurants: results });
});

app.get('/api/restaurants/:id', (req, res) => {
  const restaurant = db.restaurants.find((r) => r._id === req.params.id && !r.isDeleted);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  const owner = db.users.find((u) => u._id === restaurant.owner);
  return res.json({ success: true, restaurant: { ...restaurant, owner: owner ? { name: owner.name, email: owner.email } : restaurant.owner } });
});

app.post('/api/restaurants', authenticate, (req, res) => {
  if (!['restaurant_owner', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  const id = newId();
  const restaurant = { ...req.body, _id: id, owner: req.user._id, averageRating: 0, isOpen: true, isDeleted: false, createdAt: new Date() };
  db.restaurants.push(restaurant);
  return res.status(201).json({ success: true, restaurant });
});

app.put('/api/restaurants/:id', authenticate, (req, res) => {
  const restaurant = db.restaurants.find((r) => r._id === req.params.id && !r.isDeleted);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  if (restaurant.owner !== req.user._id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  Object.assign(restaurant, req.body);
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

/* ────────────────────────────────────────────────────────────────
   Menu routes
──────────────────────────────────────────────────────────────── */
app.get('/api/restaurants/:id/menu', (req, res) => {
  const items = db.menuItems
    .filter((i) => i.restaurant === req.params.id && !i.isDeleted && i.available)
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  return res.json({ success: true, items });
});

app.post('/api/restaurants/:id/menu', authenticate, (req, res) => {
  const restaurant = db.restaurants.find((r) => r._id === req.params.id && !r.isDeleted);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  if (restaurant.owner !== req.user._id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  const id = newId();
  const item = { ...req.body, _id: id, restaurant: req.params.id, available: true, isDeleted: false, createdAt: new Date() };
  db.menuItems.push(item);
  return res.status(201).json({ success: true, item });
});

app.put('/api/menu/:id', authenticate, (req, res) => {
  const item = db.menuItems.find((i) => i._id === req.params.id && !i.isDeleted);
  if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });
  const restaurant = db.restaurants.find((r) => r._id === item.restaurant);
  if (!restaurant || (restaurant.owner !== req.user._id && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  Object.assign(item, req.body);
  return res.json({ success: true, item });
});

app.delete('/api/menu/:id', authenticate, (req, res) => {
  const item = db.menuItems.find((i) => i._id === req.params.id && !i.isDeleted);
  if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });
  const restaurant = db.restaurants.find((r) => r._id === item.restaurant);
  if (!restaurant || (restaurant.owner !== req.user._id && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Not allowed' });
  }
  item.isDeleted = true;
  return res.json({ success: true, message: 'Menu item deleted' });
});

/* ────────────────────────────────────────────────────────────────
   Order routes
──────────────────────────────────────────────────────────────── */
app.post('/api/orders', authenticate, (req, res) => {
  const { restaurantId, items, deliveryAddress } = req.body;
  if (!restaurantId || !items || !items.length || !deliveryAddress) {
    return res.status(400).json({ success: false, message: 'restaurantId, items, and deliveryAddress are required' });
  }
  const restaurant = db.restaurants.find((r) => r._id === restaurantId && !r.isDeleted);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

  const orderItems = [];
  for (const reqItem of items) {
    const menuItem = db.menuItems.find((i) => i._id === reqItem.menuItemId && i.restaurant === restaurantId && !i.isDeleted);
    if (!menuItem) return res.status(400).json({ success: false, message: 'One or more menu items are invalid' });
    orderItems.push({ menuItem: menuItem._id, name: menuItem.name, quantity: Number(reqItem.quantity || 1), price: menuItem.price });
  }

  const subtotal = orderItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  const deliveryFee = subtotal >= FREE_DELIVERY ? 0 : DELIVERY_FEE;
  const total = subtotal + tax + deliveryFee;

  const id = newId();
  const order = {
    _id: id, id,
    customer: req.user._id,
    restaurant: restaurantId,
    items: orderItems,
    subtotal, tax, deliveryFee, total,
    deliveryAddress,
    status: 'placed',
    estimatedDeliveryAt: new Date(Date.now() + (restaurant.deliveryTimeMinutes || 30) * 60000),
    isDeleted: false,
    createdAt: new Date()
  };
  db.orders.push(order);
  return res.status(201).json({ success: true, order });
});

app.get('/api/orders', authenticate, (req, res) => {
  let orders = db.orders.filter((o) => !o.isDeleted);
  if (req.user.role === 'customer') orders = orders.filter((o) => o.customer === req.user._id);
  orders = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json({ success: true, orders });
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

  const valid = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!valid.includes(req.body.status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  order.status = req.body.status;
  return res.json({ success: true, order });
});

/* ────────────────────────────────────────────────────────────────
   Review routes
──────────────────────────────────────────────────────────────── */
app.post('/api/restaurants/:id/reviews', authenticate, (req, res) => {
  const restaurant = db.restaurants.find((r) => r._id === req.params.id && !r.isDeleted);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  const rating = Number(req.body.rating);
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'Rating must be 1-5' });

  const id = newId();
  const review = { _id: id, restaurant: req.params.id, user: req.user._id, userName: req.user.name, rating, comment: req.body.comment || '', createdAt: new Date() };
  db.reviews.push(review);

  // Update average rating
  const ratingList = db.reviews.filter((r) => r.restaurant === req.params.id).map((r) => r.rating);
  restaurant.averageRating = Number((ratingList.reduce((a, b) => a + b, 0) / ratingList.length).toFixed(1));

  return res.status(201).json({ success: true, review });
});

app.get('/api/restaurants/:id/reviews', (req, res) => {
  const reviews = db.reviews
    .filter((r) => r.restaurant === req.params.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json({ success: true, reviews });
});

/* ────────────────────────────────────────────────────────────────
   Search route
──────────────────────────────────────────────────────────────── */
app.get('/api/search', (req, res) => {
  const { q = '', cuisine } = req.query;
  const query = q.trim().toLowerCase();

  let restaurants = db.restaurants.filter((r) => !r.isDeleted);
  if (cuisine) restaurants = restaurants.filter((r) => r.cuisine.includes(cuisine));
  if (query) {
    restaurants = restaurants.filter((r) =>
      r.name.toLowerCase().includes(query) ||
      (r.description || '').toLowerCase().includes(query) ||
      r.location.city.toLowerCase().includes(query)
    );
  }
  restaurants = restaurants.sort((a, b) => b.averageRating - a.averageRating);

  const menuItems = query
    ? db.menuItems.filter((i) => !i.isDeleted && i.name.toLowerCase().includes(query))
    : [];

  return res.json({ success: true, restaurants, menuItems });
});

/* ────────────────────────────────────────────────────────────────
   404 / error handlers
──────────────────────────────────────────────────────────────── */
app.use((req, res) => {
  if (req.accepts('html')) return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  return res.status(404).json({ success: false, message: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

/* ────────────────────────────────────────────────────────────────
   Start
──────────────────────────────────────────────────────────────── */
seedDemoData().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀  BombayLane demo server running at http://localhost:${PORT}`);
    console.log('\nDemo credentials:');
    console.log('  Customer:  demo@bombaylane.com   /  Demo@1234!');
    console.log('  Owner:     owner@bombaylane.com  /  Owner@1234!');
    console.log('  Admin:     admin@bombaylane.com  /  Admin@1234!\n');
  });
}).catch((err) => {
  console.error('Failed to seed demo data:', err.message);
  process.exit(1);
});

module.exports = app;
