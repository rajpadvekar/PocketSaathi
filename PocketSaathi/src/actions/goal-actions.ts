"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "../lib/prisma";

export async function addGoalAction(g: {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const todayStr = new Date().toISOString().split("T")[0];
  if (g.deadline < todayStr) {
    throw new Error("Goal deadline must be today or a future date.");
  }

  try {
    return await prisma.savingsGoal.create({
      data: {
        userId,
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        deadline: g.deadline,
        category: g.category,
      },
    });
  } catch (err: any) {
    console.error("Error in addGoalAction server action:", err.message);
    throw err;
  }
}

export async function contributeToGoalAction(id: string, amount: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const goal = await prisma.savingsGoal.findUnique({ where: { id } });
    if (!goal) throw new Error("Goal not found");
    if (goal.userId !== userId) throw new Error("Unauthorized access to resource");

    const newAmount = Math.min(goal.targetAmount, goal.currentAmount + amount);

    // Create a corresponding investment transaction
    await prisma.transaction.create({
      data: {
        userId,
        type: "expense",
        category: "Investments",
        subcategory: "Goals Contribution",
        amount,
        merchant: `Goal: ${goal.name}`,
        date: new Date().toISOString().split("T")[0],
        note: `Contribution to ${goal.name}`,
      },
    });

    return await prisma.savingsGoal.update({
      where: { id },
      data: { currentAmount: newAmount },
    });
  } catch (err: any) {
    console.error("Error in contributeToGoalAction server action:", err.message);
    throw err;
  }
}

export async function deleteGoalAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    return await prisma.savingsGoal.delete({
      where: { id },
    });
  } catch (err: any) {
    console.error("Error in deleteGoalAction server action:", err.message);
    throw err;
  }
}
