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
  const txs = await prisma.transaction.findMany({});
  console.log(`Total transactions in DB: ${txs.length}`);
  txs.forEach((t, i) => {
    console.log(`[${i}] ID: ${t.id}`);
    console.log(`    Merchant: ${JSON.stringify(t.merchant)}`);
    console.log(`    Note: ${JSON.stringify(t.note)}`);
    console.log(`    Tags: ${JSON.stringify(t.tags)}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
