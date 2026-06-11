"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "../lib/prisma";

export async function addTransactionAction(tx: {
  type: string;
  category: string;
  subcategory?: string | null;
  amount: number;
  merchant: string;
  date: string;
  note?: string | null;
  tags?: string[];
  recurring?: boolean;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    if (tx.type === "expense") {
      const aggregates = await prisma.transaction.groupBy({
        by: ['type'],
        where: { userId },
        _sum: { amount: true }
      });
      
      const incomeSum = aggregates.find(a => a.type === 'income')?._sum.amount || 0;
      const expenseSum = aggregates.find(a => a.type === 'expense')?._sum.amount || 0;
      const currentBalance = incomeSum - expenseSum;

      if (tx.amount > currentBalance) {
        throw new Error(`Insufficient funds: Your current balance is ₹${currentBalance.toLocaleString()}, which is less than the transaction amount of ₹${tx.amount.toLocaleString()}.`);
      }
    }

    return await prisma.transaction.create({
      data: {
        userId,
        type: tx.type,
        category: tx.category,
        subcategory: tx.subcategory || null,
        amount: tx.amount,
        merchant: tx.merchant,
        date: tx.date,
        note: tx.note || null,
        tags: tx.tags || [],
        recurring: tx.recurring ?? false,
      },
    });
  } catch (err: any) {
    console.error("Error in addTransactionAction server action:", err.message);
    throw err;
  }
}

export async function updateTransactionAction(
  id: string,
  updates: {
    type?: string;
    category?: string;
    subcategory?: string | null;
    amount?: number;
    merchant?: string;
    date?: string;
    note?: string | null;
    tags?: string[];
    recurring?: boolean;
  }
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const oldTx = await prisma.transaction.findUnique({
      where: { id },
    });
    if (!oldTx) throw new Error("Transaction not found");
    if (oldTx.userId !== userId) throw new Error("Unauthorized access to transaction");

    const targetType = updates.type || oldTx.type;
    const targetAmount = updates.amount !== undefined ? updates.amount : oldTx.amount;

    if (targetType === "expense" || oldTx.type === "income") {
      const aggregates = await prisma.transaction.groupBy({
        by: ['type'],
        where: { userId },
        _sum: { amount: true }
      });
      
      let incomeSum = aggregates.find(a => a.type === 'income')?._sum.amount || 0;
      let expenseSum = aggregates.find(a => a.type === 'expense')?._sum.amount || 0;

      if (oldTx.type === "income") {
        incomeSum -= oldTx.amount;
      } else {
        expenseSum -= oldTx.amount;
      }

      if (targetType === "income") {
        incomeSum += targetAmount;
      } else {
        expenseSum += targetAmount;
      }

      const prospectiveBalance = incomeSum - expenseSum;
      if (prospectiveBalance < 0) {
        throw new Error(`Insufficient funds: This update would result in a negative balance of ₹${prospectiveBalance.toLocaleString()}.`);
      }
    }

    return await prisma.transaction.update({
      where: { id },
      data: {
        type: updates.type,
        category: updates.category,
        subcategory: updates.subcategory === undefined ? undefined : (updates.subcategory || null),
        amount: updates.amount,
        merchant: updates.merchant,
        date: updates.date,
        note: updates.note === undefined ? undefined : (updates.note || null),
        tags: updates.tags,
        recurring: updates.recurring,
      },
    });
  } catch (err: any) {
    console.error("Error in updateTransactionAction server action:", err.message);
    throw err;
  }
}

export async function deleteTransactionAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    return await prisma.transaction.delete({
      where: { id },
    });
  } catch (err: any) {
    console.error("Error in deleteTransactionAction server action:", err.message);
    throw err;
  }
}

export async function bulkDeleteTransactionsAction(ids: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    return await prisma.transaction.deleteMany({
      where: {
        id: { in: ids },
        userId, // ensure safety boundary
      },
    });
  } catch (err: any) {
    console.error("Error in bulkDeleteTransactionsAction server action:", err.message);
    throw err;
  }
}
