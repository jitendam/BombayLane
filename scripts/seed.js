/**
 * Seed script – populates the PostgreSQL database (via Prisma) with demo data.
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
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

async function seed() {
  await prisma.$connect();
  console.log('Connected to database');

  const existing = await prisma.user.findFirst({ where: { email: 'admin@bombaylane.com' } });
  if (existing) {
    console.log('Database already seeded – skipping.');
    await prisma.$disconnect();
    return;
  }

  /* ── Users ────────────────────────────────────────────────────── */
  const [adminHash, ownerHash, customerHash] = await Promise.all([
    bcrypt.hash('Admin@1234!', BCRYPT_ROUNDS),
    bcrypt.hash('Owner@1234!', BCRYPT_ROUNDS),
    bcrypt.hash('Demo@1234!', BCRYPT_ROUNDS)
  ]);

  await prisma.user.create({ data: { name: 'Admin', email: 'admin@bombaylane.com', password: adminHash, role: 'admin' } });
  const owner = await prisma.user.create({
    data: { name: 'Raj Sharma', email: 'owner@bombaylane.com', password: ownerHash, role: 'restaurant_owner', phone: '9988776655' }
  });
  await prisma.user.create({
    data: { name: 'Priya Demo', email: 'demo@bombaylane.com', password: customerHash, role: 'customer', phone: '9876543210', address: '42 MG Road, Bandra West, Mumbai 400050' }
  });

  /* ── Restaurants ──────────────────────────────────────────────── */
  const [spiceGardens, dosaCo, streetBites, curryHouse] = await Promise.all([
    prisma.restaurant.create({ data: { name: 'Spice Gardens', description: 'Authentic North Indian cuisine with rich gravies and tandoor specialties.', cuisine: ['North Indian'], ownerId: owner.id, locationAddress: '12 Bandra West, Near Hill Road', locationCity: 'Mumbai', openHours: '11:00', closeHours: '23:00', averageRating: 4.5, deliveryTimeMinutes: 30, isOpen: true } }),
    prisma.restaurant.create({ data: { name: 'Dosa Corner', description: 'Classic South Indian breakfast and meals – crispy dosas and fluffy idlis.', cuisine: ['South Indian'], ownerId: owner.id, locationAddress: '7 Matunga East, Near Station', locationCity: 'Mumbai', openHours: '07:00', closeHours: '22:00', averageRating: 4.3, deliveryTimeMinutes: 25, isOpen: true } }),
    prisma.restaurant.create({ data: { name: 'Street Bites', description: "Mumbai street food favorites – vada pav, pav bhaji and more!", cuisine: ['Street Food'], ownerId: owner.id, locationAddress: '5 FC Road, Shivaji Nagar', locationCity: 'Pune', openHours: '10:00', closeHours: '21:00', averageRating: 4.1, deliveryTimeMinutes: 20, isOpen: true } }),
    prisma.restaurant.create({ data: { name: 'The Curry House', description: 'Mughlai and North Indian delicacies – biryanis, kebabs, and more.', cuisine: ['North Indian', 'Mughlai'], ownerId: owner.id, locationAddress: '34 Connaught Place', locationCity: 'Delhi', openHours: '12:00', closeHours: '23:30', averageRating: 4.7, deliveryTimeMinutes: 40, isOpen: true } })
  ]);

  /* ── Menu Items ───────────────────────────────────────────────── */
  await prisma.menuItem.createMany({
    data: [
      // Spice Gardens
      { restaurantId: spiceGardens.id, name: 'Butter Chicken', description: 'Tender chicken in a creamy tomato sauce.', category: 'Main Course', price: 320, isVegetarian: false },
      { restaurantId: spiceGardens.id, name: 'Dal Makhani', description: 'Slow-cooked black lentils with butter and cream.', category: 'Main Course', price: 260, isVegetarian: true },
      { restaurantId: spiceGardens.id, name: 'Garlic Naan', description: 'Soft leavened bread with garlic butter.', category: 'Breads', price: 60, isVegetarian: true },
      { restaurantId: spiceGardens.id, name: 'Chicken Biryani', description: 'Fragrant basmati rice layered with spiced chicken.', category: 'Rice', price: 380, isVegetarian: false },
      { restaurantId: spiceGardens.id, name: 'Gulab Jamun', description: 'Soft milk-solid dumplings soaked in rose syrup.', category: 'Desserts', price: 120, isVegetarian: true },
      // Dosa Corner
      { restaurantId: dosaCo.id, name: 'Masala Dosa', description: 'Crispy rice crepe filled with spiced potato.', category: 'Main', price: 140, isVegetarian: true },
      { restaurantId: dosaCo.id, name: 'Idli Sambar', description: 'Steamed rice cakes with lentil soup and chutneys.', category: 'Main', price: 100, isVegetarian: true },
      { restaurantId: dosaCo.id, name: 'Medu Vada', description: 'Crunchy lentil fritters with coconut chutney.', category: 'Starters', price: 80, isVegetarian: true },
      { restaurantId: dosaCo.id, name: 'Filter Coffee', description: 'South Indian drip coffee – decoction and hot milk.', category: 'Beverages', price: 50, isVegetarian: true },
      { restaurantId: dosaCo.id, name: 'Uttapam', description: 'Thick rice pancake topped with onions and tomato.', category: 'Main', price: 120, isVegetarian: true },
      // Street Bites
      { restaurantId: streetBites.id, name: 'Vada Pav', description: "Mumbai's iconic fried potato patty in a bun.", category: 'Snacks', price: 40, isVegetarian: true },
      { restaurantId: streetBites.id, name: 'Pav Bhaji', description: 'Spiced mashed vegetables with buttered bread rolls.', category: 'Main', price: 130, isVegetarian: true },
      { restaurantId: streetBites.id, name: 'Bhel Puri', description: 'Puffed rice tossed with chutneys and vegetables.', category: 'Snacks', price: 70, isVegetarian: true },
      { restaurantId: streetBites.id, name: 'Sev Puri', description: 'Crispy puris topped with potatoes, sev, and chutneys.', category: 'Snacks', price: 80, isVegetarian: true },
      { restaurantId: streetBites.id, name: 'Misal Pav', description: 'Spicy sprouted lentil curry with bread rolls.', category: 'Main', price: 110, isVegetarian: true },
      // The Curry House
      { restaurantId: curryHouse.id, name: 'Paneer Tikka', description: 'Chargrilled cottage cheese marinated in spices.', category: 'Starters', price: 290, isVegetarian: true },
      { restaurantId: curryHouse.id, name: 'Mutton Biryani', description: 'Slow-dum cooked mutton with fragrant basmati rice.', category: 'Rice', price: 490, isVegetarian: false },
      { restaurantId: curryHouse.id, name: 'Seekh Kebab', description: 'Minced lamb kebabs grilled on skewers.', category: 'Starters', price: 360, isVegetarian: false },
      { restaurantId: curryHouse.id, name: 'Rumali Roti', description: 'Thin handkerchief-style flatbread.', category: 'Breads', price: 50, isVegetarian: true },
      { restaurantId: curryHouse.id, name: 'Shahi Kheer', description: 'Royal rice pudding with nuts and saffron.', category: 'Desserts', price: 150, isVegetarian: true }
    ]
  });

  await prisma.$disconnect();

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
