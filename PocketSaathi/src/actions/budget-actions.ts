"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "../lib/prisma";

export async function addBudgetAction(b: {
  category: string;
  limit: number;
  period: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    return await prisma.budget.upsert({
      where: {
        userId_category: {
          userId,
          category: b.category,
        },
      },
      update: {
        limit: b.limit,
        period: b.period,
      },
      create: {
        userId,
        category: b.category,
        limit: b.limit,
        period: b.period,
      },
    });
  } catch (err: any) {
    console.error("Error in addBudgetAction server action:", err.message);
    throw err;
  }
}

export async function updateBudgetAction(id: string, limit: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    return await prisma.budget.update({
      where: { id },
      data: { limit },
    });
  } catch (err: any) {
    console.error("Error in updateBudgetAction server action:", err.message);
    throw err;
  }
}

export async function deleteBudgetAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    return await prisma.budget.delete({
      where: { id },
    });
  } catch (err: any) {
    console.error("Error in deleteBudgetAction server action:", err.message);
    throw err;
  }
}
