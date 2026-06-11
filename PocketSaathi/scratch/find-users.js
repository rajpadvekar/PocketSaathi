const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({});
  console.log(`Total users in DB: ${users.length}`);
  for (const u of users) {
    const txCount = await prisma.transaction.count({ where: { userId: u.id } });
    const subCount = await prisma.subscription.count({ where: { userId: u.id } });
    const budgetCount = await prisma.budget.count({ where: { userId: u.id } });
    const goalCount = await prisma.savingsGoal.count({ where: { userId: u.id } });
    console.log(`User ID: ${u.id} | Email: ${u.email} | Name: ${u.name}`);
    console.log(`    Transactions: ${txCount} | Subscriptions: ${subCount} | Budgets: ${budgetCount} | Goals: ${goalCount}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
