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
  const transactions = await prisma.transaction.findMany({});
  
  // Table headers and rows exactly as in page.tsx
  const tableRows = transactions.map(t => [
    t.date,
    t.type === "income" ? "Income" : "Expense",
    t.merchant,
    t.category,
    `INR ${t.amount.toLocaleString()}`,
    t.note || "—"
  ]);

  console.log("PDF Table Rows:");
  console.log(JSON.stringify(tableRows, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
