"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "../lib/prisma";

export async function addSubscriptionAction(s: {
  name: string;
  amount: number;
  frequency: string;
  nextBillingDate: string;
  category: string;
  status?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    return await prisma.subscription.create({
      data: {
        userId,
        name: s.name,
        amount: s.amount,
        frequency: s.frequency,
        nextBillingDate: s.nextBillingDate,
        category: s.category,
        status: s.status || "active",
      },
    });
  } catch (err: any) {
    console.error("Error in addSubscriptionAction server action:", err.message);
    throw err;
  }
}

export async function deleteSubscriptionAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    return await prisma.subscription.delete({
      where: { id },
    });
  } catch (err: any) {
    console.error("Error in deleteSubscriptionAction server action:", err.message);
    throw err;
  }
}

export async function updateSubscriptionAction(
  id: string,
  s: Partial<{
    name: string;
    amount: number;
    frequency: string;
    nextBillingDate: string;
    category: string;
    status: string;
  }>
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    return await prisma.subscription.update({
      where: { id },
      data: s,
    });
  } catch (err: any) {
    console.error("Error in updateSubscriptionAction server action:", err.message);
    throw err;
  }
}
