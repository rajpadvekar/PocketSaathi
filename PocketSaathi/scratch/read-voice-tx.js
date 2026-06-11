const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const txs = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 10
  });
  console.log("Recent Transactions:");
  txs.forEach(t => {
    console.log(`ID: ${t.id}, Merchant: ${t.merchant}, Note: ${JSON.stringify(t.note)}, Tags: ${JSON.stringify(t.tags)}, Date: ${t.date}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
