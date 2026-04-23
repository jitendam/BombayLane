const prisma = require('../lib/prisma');

const connectDatabase = async () => {
  await prisma.$connect();
  return prisma;
};

module.exports = connectDatabase;
