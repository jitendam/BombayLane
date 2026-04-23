/**
 * Seed script – populates MongoDB with demo data.
 *
 * Usage:
 *   npm run seed
 *
 * Creates:
 *   - 1 admin user
 *   - 1 restaurant owner user
 *   - 1 customer user
 *   - 4 restaurants with ~5 menu items each
 *
 * Demo credentials are printed to stdout after seeding.
 * Re-running the script is safe – it exits if already seeded.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bombaylane';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB:', uri);

  const existing = await User.findOne({ email: 'admin@bombaylane.com' });
  if (existing) {
    console.log('Database already seeded – skipping.');
    await mongoose.disconnect();
    return;
  }

  /* ── Users ────────────────────────────────────────────────────── */
  const [adminHash, ownerHash, customerHash] = await Promise.all([
    bcrypt.hash('Admin@1234!', BCRYPT_ROUNDS),
    bcrypt.hash('Owner@1234!', BCRYPT_ROUNDS),
    bcrypt.hash('Demo@1234!', BCRYPT_ROUNDS)
  ]);

  const [, owner] = await User.create([
    {
      name: 'Admin',
      email: 'admin@bombaylane.com',
      password: adminHash,
      role: 'admin'
    },
    {
      name: 'Raj Sharma',
      email: 'owner@bombaylane.com',
      password: ownerHash,
      role: 'restaurant_owner',
      phone: '9988776655'
    },
    {
      name: 'Priya Demo',
      email: 'demo@bombaylane.com',
      password: customerHash,
      role: 'customer',
      phone: '9876543210',
      address: '42 MG Road, Bandra West, Mumbai 400050'
    }
  ]);

  /* ── Restaurants ──────────────────────────────────────────────── */
  const [spiceGardens, dosaCo, streetBites, curryHouse] = await Restaurant.create([
    {
      name: 'Spice Gardens',
      description: 'Authentic North Indian cuisine with rich gravies and tandoor specialties.',
      cuisine: ['North Indian'],
      owner: owner._id,
      location: { address: '12 Bandra West, Near Hill Road', city: 'Mumbai' },
      openingHours: { open: '11:00', close: '23:00' },
      averageRating: 4.5,
      deliveryTimeMinutes: 30,
      isOpen: true
    },
    {
      name: 'Dosa Corner',
      description: 'Classic South Indian breakfast and meals – crispy dosas and fluffy idlis.',
      cuisine: ['South Indian'],
      owner: owner._id,
      location: { address: '7 Matunga East, Near Station', city: 'Mumbai' },
      openingHours: { open: '07:00', close: '22:00' },
      averageRating: 4.3,
      deliveryTimeMinutes: 25,
      isOpen: true
    },
    {
      name: 'Street Bites',
      description: "Mumbai street food favorites – vada pav, pav bhaji and more!",
      cuisine: ['Street Food'],
      owner: owner._id,
      location: { address: '5 FC Road, Shivaji Nagar', city: 'Pune' },
      openingHours: { open: '10:00', close: '21:00' },
      averageRating: 4.1,
      deliveryTimeMinutes: 20,
      isOpen: true
    },
    {
      name: 'The Curry House',
      description: 'Mughlai and North Indian delicacies – biryanis, kebabs, and more.',
      cuisine: ['North Indian', 'Mughlai'],
      owner: owner._id,
      location: { address: '34 Connaught Place', city: 'Delhi' },
      openingHours: { open: '12:00', close: '23:30' },
      averageRating: 4.7,
      deliveryTimeMinutes: 40,
      isOpen: true
    }
  ]);

  /* ── Menu Items ───────────────────────────────────────────────── */
  await MenuItem.create([
    // Spice Gardens
    { restaurant: spiceGardens._id, name: 'Butter Chicken', description: 'Tender chicken in a creamy tomato sauce.', category: 'Main Course', price: 320, isVegetarian: false },
    { restaurant: spiceGardens._id, name: 'Dal Makhani', description: 'Slow-cooked black lentils with butter and cream.', category: 'Main Course', price: 260, isVegetarian: true },
    { restaurant: spiceGardens._id, name: 'Garlic Naan', description: 'Soft leavened bread with garlic butter.', category: 'Breads', price: 60, isVegetarian: true },
    { restaurant: spiceGardens._id, name: 'Chicken Biryani', description: 'Fragrant basmati rice layered with spiced chicken.', category: 'Rice', price: 380, isVegetarian: false },
    { restaurant: spiceGardens._id, name: 'Gulab Jamun', description: 'Soft milk-solid dumplings soaked in rose syrup.', category: 'Desserts', price: 120, isVegetarian: true },

    // Dosa Corner
    { restaurant: dosaCo._id, name: 'Masala Dosa', description: 'Crispy rice crepe filled with spiced potato.', category: 'Main', price: 140, isVegetarian: true },
    { restaurant: dosaCo._id, name: 'Idli Sambar', description: 'Steamed rice cakes with lentil soup and chutneys.', category: 'Main', price: 100, isVegetarian: true },
    { restaurant: dosaCo._id, name: 'Medu Vada', description: 'Crunchy lentil fritters with coconut chutney.', category: 'Starters', price: 80, isVegetarian: true },
    { restaurant: dosaCo._id, name: 'Filter Coffee', description: 'South Indian drip coffee – decoction and hot milk.', category: 'Beverages', price: 50, isVegetarian: true },
    { restaurant: dosaCo._id, name: 'Uttapam', description: 'Thick rice pancake topped with onions and tomato.', category: 'Main', price: 120, isVegetarian: true },

    // Street Bites
    { restaurant: streetBites._id, name: 'Vada Pav', description: "Mumbai's iconic fried potato patty in a bun.", category: 'Snacks', price: 40, isVegetarian: true },
    { restaurant: streetBites._id, name: 'Pav Bhaji', description: 'Spiced mashed vegetables with buttered bread rolls.', category: 'Main', price: 130, isVegetarian: true },
    { restaurant: streetBites._id, name: 'Bhel Puri', description: 'Puffed rice tossed with chutneys and vegetables.', category: 'Snacks', price: 70, isVegetarian: true },
    { restaurant: streetBites._id, name: 'Sev Puri', description: 'Crispy puris topped with potatoes, sev, and chutneys.', category: 'Snacks', price: 80, isVegetarian: true },
    { restaurant: streetBites._id, name: 'Misal Pav', description: 'Spicy sprouted lentil curry with bread rolls.', category: 'Main', price: 110, isVegetarian: true },

    // The Curry House
    { restaurant: curryHouse._id, name: 'Paneer Tikka', description: 'Chargrilled cottage cheese marinated in spices.', category: 'Starters', price: 290, isVegetarian: true },
    { restaurant: curryHouse._id, name: 'Mutton Biryani', description: 'Slow-dum cooked mutton with fragrant basmati rice.', category: 'Rice', price: 490, isVegetarian: false },
    { restaurant: curryHouse._id, name: 'Seekh Kebab', description: 'Minced lamb kebabs grilled on skewers.', category: 'Starters', price: 360, isVegetarian: false },
    { restaurant: curryHouse._id, name: 'Rumali Roti', description: 'Thin handkerchief-style flatbread.', category: 'Breads', price: 50, isVegetarian: true },
    { restaurant: curryHouse._id, name: 'Shahi Kheer', description: 'Royal rice pudding with nuts and saffron.', category: 'Desserts', price: 150, isVegetarian: true }
  ]);

  await mongoose.disconnect();

  console.log('\n✅ Database seeded successfully!\n');
  console.log('Demo credentials:');
  console.log('  Admin:            admin@bombaylane.com  /  Admin@1234!');
  console.log('  Restaurant owner: owner@bombaylane.com  /  Owner@1234!');
  console.log('  Customer:         demo@bombaylane.com   /  Demo@1234!');
  console.log('\nVisit http://localhost:5000 to start the demo.\n');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
