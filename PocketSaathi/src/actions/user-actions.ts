"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "../lib/prisma";

export async function getOrCreateUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized: No session found");

  try {
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses[0]?.emailAddress || `${userId}@clerk-placeholder.com`;
      const name = clerkUser ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() : "Clerk User";

      user = await prisma.user.create({
        data: {
          id: userId,
          email,
          name: name || "Clerk User",
          healthScore: 100,
          streakCurrent: 0,
          streakHighest: 0,
          twinName: "Mitra Twin v1",
          twinPersonality: "Balanced Planner",
          twinRisk: "medium",
        },
      });
    }

    return user;
  } catch (err: any) {
    console.error("Error in getOrCreateUser server action:", err.message);
    throw err;
  }
}

export async function getUserData() {
  try {
    const user = await getOrCreateUser();
    
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const budgets = await prisma.budget.findMany({
      where: { userId: user.id },
    });

    const goals = await prisma.savingsGoal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return {
      user,
      transactions,
      budgets,
      goals,
      subscriptions,
    };
  } catch (err: any) {
    console.error("Error in getUserData server action:", err.message);
    throw err;
  }
}

export async function updateUserProfile(updates: {
  healthScore?: number;
  streakCurrent?: number;
  streakHighest?: number;
  twinName?: string;
  twinPersonality?: string;
  twinRisk?: string;
  onboardingComplete?: boolean;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    return await prisma.user.update({
      where: { id: userId },
      data: updates,
    });
  } catch (err: any) {
    console.error("Error in updateUserProfile server action:", err.message);
    throw err;
  }
}

export async function setupInitialUserAction(
  salary: number,
  autoBudget: boolean,
  useSandbox: boolean,
  firstName?: string,
  lastName?: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const user = await getOrCreateUser();

    // 1. Delete all existing data for this user
    await prisma.transaction.deleteMany({ where: { userId: user.id } });
    await prisma.budget.deleteMany({ where: { userId: user.id } });
    await prisma.savingsGoal.deleteMany({ where: { userId: user.id } });
    await prisma.subscription.deleteMany({ where: { userId: user.id } });

    // 2. Update user profile name and onboarding flag
    const fullName = `${firstName || ""} ${lastName || ""}`.trim() || user.name || "Clerk User";
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: fullName,
        healthScore: useSandbox ? 72 : 0,
        streakCurrent: useSandbox ? 6 : 0,
        streakHighest: useSandbox ? 15 : 0,
        onboardingComplete: true,
      },
    });

    if (useSandbox) {
      // Seed sandbox data
      await prisma.transaction.createMany({
        data: [
          { userId: user.id, type: "income", category: "Salary", amount: 85000, merchant: "Hedge Corporate Corp", date: "2026-06-01", note: "Monthly base salary" },
          { userId: user.id, type: "expense", category: "Housing", amount: 22000, merchant: "Co-Living Spaces Ltd", date: "2026-06-02", note: "Rent", recurring: true },
          { userId: user.id, type: "expense", category: "Food", subcategory: "Dining", amount: 1250, merchant: "Swiggy (Zomato)", date: "2026-06-03", tags: ["delivery", "weekend"] },
          { userId: user.id, type: "expense", category: "Transport", subcategory: "Cabs", amount: 480, merchant: "Uber", date: "2026-06-04", note: "Ride to office" },
          { userId: user.id, type: "expense", category: "Entertainment", subcategory: "Subscriptions", amount: 649, merchant: "Netflix", date: "2026-06-05", recurring: true },
          { userId: user.id, type: "expense", category: "Shopping", subcategory: "Electronics", amount: 8990, merchant: "Amazon", date: "2026-06-06", note: "Noise cancelling earbuds", tags: ["lifestyle"] },
          { userId: user.id, type: "income", category: "Freelance", amount: 15000, merchant: "Upwork Client", date: "2026-06-07", note: "UI Design project payout" },
          { userId: user.id, type: "expense", category: "Utilities", amount: 2450, merchant: "Tata Power", date: "2026-06-08", note: "Electricity bill", recurring: true },
          { userId: user.id, type: "expense", category: "Food", subcategory: "Groceries", amount: 3120, merchant: "Zepto", date: "2026-06-08", note: "Weekly grocery run" },
          { userId: user.id, type: "expense", category: "Investments", subcategory: "Mutual Funds", amount: 10000, merchant: "Zerodha SIP", date: "2026-06-05", recurring: true },
          { userId: user.id, type: "expense", category: "Entertainment", subcategory: "Clubs", amount: 12500, merchant: "Playboy Club Mumbai", date: "2026-06-07", note: "Party", tags: ["outlier"] },
          { userId: user.id, type: "expense", category: "Food", subcategory: "Dining", amount: 1250, merchant: "Swiggy (Zomato)", date: "2026-06-03", tags: ["duplicate"] },
        ],
      });

      await prisma.budget.createMany({
        data: [
          { userId: user.id, category: "Food", limit: 12000, period: "monthly" },
          { userId: user.id, category: "Transport", limit: 5000, period: "monthly" },
          { userId: user.id, category: "Shopping", limit: 15000, period: "monthly" },
          { userId: user.id, category: "Entertainment", limit: 8000, period: "monthly" },
          { userId: user.id, category: "Utilities", limit: 6000, period: "monthly" },
        ],
      });

      await prisma.savingsGoal.createMany({
        data: [
          { userId: user.id, name: "Emergency Fund", targetAmount: 150000, currentAmount: 85000, deadline: "2026-12-31", category: "Emergency Fund" },
          { userId: user.id, name: "Iceland Northern Lights Trip", targetAmount: 250000, currentAmount: 60000, deadline: "2027-02-28", category: "Vacation" },
          { userId: user.id, name: "New iPad Pro", targetAmount: 90000, currentAmount: 45000, deadline: "2026-09-15", category: "Custom" },
        ],
      });

      await prisma.subscription.createMany({
        data: [
          { userId: user.id, name: "Netflix Premium", amount: 649, frequency: "monthly", nextBillingDate: "2026-07-05", category: "Entertainment", status: "active" },
          { userId: user.id, name: "Spotify Premium", amount: 179, frequency: "monthly", nextBillingDate: "2026-07-12", category: "Entertainment", status: "active" },
          { userId: user.id, name: "Amazon Prime", amount: 1499, frequency: "yearly", nextBillingDate: "2026-12-24", category: "Shopping", status: "active" },
          { userId: user.id, name: "Cult.fit Gym Membership", amount: 12000, frequency: "yearly", nextBillingDate: "2027-01-15", category: "Health & Fitness", status: "active" },
        ],
      });
    } else {
      if (salary > 0) {
        await prisma.transaction.create({
          data: {
            userId: user.id,
            type: "income",
            category: "Salary",
            amount: salary,
            merchant: "Monthly In-Hand Salary",
            date: new Date().toISOString().split("T")[0],
            note: "Initial base salary setup",
          },
        });
      }

      if (autoBudget && salary > 0) {
        await prisma.budget.createMany({
          data: [
            { userId: user.id, category: "Food", limit: Math.round(salary * 0.15), period: "monthly" },
            { userId: user.id, category: "Transport", limit: Math.round(salary * 0.08), period: "monthly" },
            { userId: user.id, category: "Shopping", limit: Math.round(salary * 0.15), period: "monthly" },
            { userId: user.id, category: "Entertainment", limit: Math.round(salary * 0.10), period: "monthly" },
            { userId: user.id, category: "Utilities", limit: Math.round(salary * 0.10), period: "monthly" },
          ],
        });
      }
    }
  } catch (err: any) {
    console.error("Error in setupInitialUserAction server action:", err.message);
    throw err;
  }
}
