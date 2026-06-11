"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  getUserData,
  updateUserProfile,
  setupInitialUserAction,
} from "../actions/user-actions";
import {
  addTransactionAction,
  updateTransactionAction,
  deleteTransactionAction,
  bulkDeleteTransactionsAction,
} from "../actions/transaction-actions";
import {
  addBudgetAction,
  updateBudgetAction,
  deleteBudgetAction,
} from "../actions/budget-actions";
import {
  addGoalAction,
  contributeToGoalAction,
  deleteGoalAction,
} from "../actions/goal-actions";
import {
  addSubscriptionAction,
  deleteSubscriptionAction,
  updateSubscriptionAction,
} from "../actions/subscription-actions";

export interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  subcategory?: string;
  amount: number;
  merchant: string;
  date: string; // YYYY-MM-DD
  note?: string;
  tags?: string[];
  recurring?: boolean;
  receiptUrl?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  period: "weekly" | "monthly";
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: "Emergency Fund" | "Vacation" | "Vehicle" | "Education" | "House" | "Custom";
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: "monthly" | "yearly";
  nextBillingDate: string;
  category: string;
  status: "active" | "paused";
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  icon: string;
}

export interface FinancialTwin {
  name: string;
  personality: "Saver" | "Investor" | "Balanced Planner" | "Impulse Buyer" | "Lifestyle Spender";
  riskTolerance: "low" | "medium" | "high";
  learningProgress: number; // 0 to 100
  insights: string[];
}

export const isCurrentMonth = (dateStr: string) => {
  const today = new Date();
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
};

export function generateTwinInsights(
  transactions: Transaction[],
  budgets: Budget[],
  goals: SavingsGoal[],
  subscriptions: Subscription[]
): string[] {
  const insights: string[] = [];

  // Check if this is a fresh user with no transactions
  if (transactions.length === 0) {
    return [
      "Welcome to PocketSaathi! Add your first transaction to calibrate your AI Financial Twin.",
      "Set up monthly category budgets to monitor and limit your expenses.",
      "Create a savings goal (like an Emergency Fund) to model future affordability.",
      "Track recurring subscriptions or bills to get proactive upcoming due reminders.",
    ];
  }

  // 1. Duplicate transaction check
  const seen = new Set<string>();
  let duplicateTx: any = null;
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    const key = `${tx.date}_${tx.merchant.toLowerCase()}_${tx.amount}`;
    if (seen.has(key)) {
      duplicateTx = tx;
      break;
    }
    seen.add(key);
  }
  if (duplicateTx) {
    insights.push(
      `A duplicate expense was detected for ${duplicateTx.merchant} on ${duplicateTx.date} (₹${duplicateTx.amount.toLocaleString()}). Review it in Transactions.`
    );
  }

  // 2. Spending Peak check (e.g., weekend spending)
  const weekendDining = transactions.filter(t => {
    if (t.type !== "expense" || t.category.toLowerCase() !== "food") return false;
    const day = new Date(t.date).getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    return day === 0 || day === 5 || day === 6;
  });
  if (weekendDining.length > 1) {
    insights.push("Your dining expenses (Swiggy) peak on Fridays and Sundays.");
  } else {
    // Fallback: top category check
    const categoryTotals: Record<string, number> = {};
    transactions.filter(t => t.type === "expense" && isCurrentMonth(t.date)).forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      insights.push(`Your highest expense category is ${topCategory[0]}, totaling ₹${topCategory[1].toLocaleString()} this month.`);
    }
  }

  // 3. Category budget check
  let budgetWarning = false;
  for (const b of budgets) {
    const totalSpent = transactions
      .filter(t => t.type === "expense" && t.category === b.category && isCurrentMonth(t.date))
      .reduce((sum, t) => sum + t.amount, 0);
    const pct = (totalSpent / b.limit) * 100;
    if (pct >= 85) {
      insights.push(`Alert: Your ${b.category} spending is at ${pct.toFixed(0)}% of your ₹${b.limit.toLocaleString()} monthly limit.`);
      budgetWarning = true;
      break;
    }
  }

  // 4. Savings Goal / SIP acceleration check
  if (goals.length > 0) {
    const goal = goals[0];
    const diff = goal.targetAmount - goal.currentAmount;
    if (diff > 0) {
      const daysSaved = Math.min(90, Math.round((2000 / (diff || 1)) * 365));
      insights.push(`Increasing your SIP by ₹2,000 will accelerate your "${goal.name}" goal by ${daysSaved > 10 ? daysSaved : 45} days.`);
    }
  }

  // 5. Upcoming Bills & EMIs due check (due in next 3 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeSubs = subscriptions.filter(s => s.status === "active" && s.nextBillingDate);
  for (const sub of activeSubs) {
    const dueDate = new Date(sub.nextBillingDate);
    dueDate.setHours(0, 0, 0, 0);
    if (!isNaN(dueDate.getTime())) {
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 3) {
        const typeLabel = sub.category === "EMI" ? "EMI" : sub.category === "Utility Bill" ? "Bill" : "Subscription";
        insights.push(
          `Your ${sub.name} ${typeLabel} of ₹${sub.amount.toLocaleString()} is due ${diffDays === 0 ? "today" : diffDays === 1 ? "in 1 day" : `in ${diffDays} days`} (${sub.nextBillingDate}). Mark it as paid to log it in your ledger.`
        );
      }
    }
  }

  // Fallback to make sure we always have 4 solid insights
  const fallbacks = [
    "Keep your category budgets updated to calibrate your AI Financial Twin personality.",
    "Log your expenses daily to improve the accuracy of your cash flow model.",
    "A high saving rate boosts your Financial Health Score and increases streak shields.",
    "Try using the Voice Assistant widget to quickly log transactions in natural language.",
    "Scan receipts via OCR to instantly populate merchant and item details in the ledger.",
    "Automate your utility bills to build a credit card payout streak."
  ];
  let fallbackIdx = 0;
  while (insights.length < 4 && fallbackIdx < fallbacks.length) {
    if (!insights.includes(fallbacks[fallbackIdx])) {
      insights.push(fallbacks[fallbackIdx]);
    }
    fallbackIdx++;
  }

  return insights.slice(0, 4);
}

interface FinanceContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  bulkDeleteTransactions: (ids: string[]) => void;
  budgets: Budget[];
  addBudget: (b: Omit<Budget, "id">) => void;
  updateBudget: (id: string, limit: number) => void;
  deleteBudget: (id: string) => void;
  goals: SavingsGoal[];
  addGoal: (g: Omit<SavingsGoal, "id">) => void;
  contributeToGoal: (id: string, amount: number) => void;
  deleteGoal: (id: string) => void;
  subscriptions: Subscription[];
  addSubscription: (s: Omit<Subscription, "id">) => void;
  deleteSubscription: (id: string) => void;
  updateSubscription: (id: string, updatedFields: Partial<Subscription>) => void;
  streaks: {
    current: number;
    highest: number;
  };
  achievements: Achievement[];
  financialTwin: FinancialTwin;
  updateTwinPersonality: (personality: FinancialTwin["personality"]) => void;
  healthScore: number;
  setInitialSetup: (
    salary: number,
    autoBudget: boolean,
    useSandbox: boolean,
    firstName?: string,
    lastName?: string
  ) => Promise<void>;
  isLoading: boolean;
  isDbConnected: boolean;
  userProfile: {
    id: string;
    email: string;
    name: string | null;
    onboardingComplete: boolean;
  } | null;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// Initial Rich Mock Data (used as sandbox fallback)
const initialTransactions: Transaction[] = [
  { id: "tx-1", type: "income", category: "Salary", amount: 85000, merchant: "Hedge Corporate Corp", date: "2026-06-01", note: "Monthly base salary" },
  { id: "tx-2", type: "expense", category: "Housing", amount: 22000, merchant: "Co-Living Spaces Ltd", date: "2026-06-02", note: "Rent", recurring: true },
  { id: "tx-3", type: "expense", category: "Food", subcategory: "Dining", amount: 1250, merchant: "Swiggy (Zomato)", date: "2026-06-03", tags: ["delivery", "weekend"] },
  { id: "tx-4", type: "expense", category: "Transport", subcategory: "Cabs", amount: 480, merchant: "Uber", date: "2026-06-04", note: "Ride to office" },
  { id: "tx-5", type: "expense", category: "Entertainment", subcategory: "Subscriptions", amount: 649, merchant: "Netflix", date: "2026-06-05", recurring: true },
  { id: "tx-6", type: "expense", category: "Shopping", subcategory: "Electronics", amount: 8990, merchant: "Amazon", date: "2026-06-06", note: "Noise cancelling earbuds", tags: ["lifestyle"] },
  { id: "tx-7", type: "income", category: "Freelance", amount: 15000, merchant: "Upwork Client", date: "2026-06-07", note: "UI Design project payout" },
  { id: "tx-8", type: "expense", category: "Utilities", amount: 2450, merchant: "Tata Power", date: "2026-06-08", note: "Electricity bill", recurring: true },
  { id: "tx-9", type: "expense", category: "Food", subcategory: "Groceries", amount: 3120, merchant: "Zepto", date: "2026-06-08", note: "Weekly grocery run" },
  { id: "tx-10", type: "expense", category: "Investments", subcategory: "Mutual Funds", amount: 10000, merchant: "Zerodha SIP", date: "2026-06-05", recurring: true },
  { id: "tx-11", type: "expense", category: "Entertainment", subcategory: "Clubs", amount: 12500, merchant: "Playboy Club Mumbai", date: "2026-06-07", note: "Party", tags: ["outlier"] },
  { id: "tx-12", type: "expense", category: "Food", subcategory: "Dining", amount: 1250, merchant: "Swiggy (Zomato)", date: "2026-06-03", tags: ["duplicate"] },
];

const initialBudgets: Budget[] = [
  { id: "b-1", category: "Food", limit: 12000, period: "monthly" },
  { id: "b-2", category: "Transport", limit: 5000, period: "monthly" },
  { id: "b-3", category: "Shopping", limit: 15000, period: "monthly" },
  { id: "b-4", category: "Entertainment", limit: 8000, period: "monthly" },
  { id: "b-5", category: "Utilities", limit: 6000, period: "monthly" },
];

const initialGoals: SavingsGoal[] = [
  { id: "g-1", name: "Emergency Fund", targetAmount: 150000, currentAmount: 85000, deadline: "2026-12-31", category: "Emergency Fund" },
  { id: "g-2", name: "Iceland Northern Lights Trip", targetAmount: 250000, currentAmount: 60000, deadline: "2027-02-28", category: "Vacation" },
  { id: "g-3", name: "New iPad Pro", targetAmount: 90000, currentAmount: 45000, deadline: "2026-09-15", category: "Custom" },
];

const initialSubscriptions: Subscription[] = [
  { id: "s-1", name: "Netflix Premium", amount: 649, frequency: "monthly", nextBillingDate: "2026-07-05", category: "Entertainment", status: "active" },
  { id: "s-2", name: "Spotify Premium", amount: 179, frequency: "monthly", nextBillingDate: "2026-07-12", category: "Entertainment", status: "active" },
  { id: "s-3", name: "Amazon Prime", amount: 1499, frequency: "yearly", nextBillingDate: "2026-12-24", category: "Shopping", status: "active" },
  { id: "s-4", name: "Cult.fit Gym Membership", amount: 12000, frequency: "yearly", nextBillingDate: "2027-01-15", category: "Health & Fitness", status: "active" },
];

const initialAchievements: Achievement[] = [
  { id: "ac-1", title: "First ₹10,000 Saved", description: "Successfully set aside your first major milestone.", unlocked: true, unlockedAt: "2026-05-10", icon: "💰" },
  { id: "ac-2", title: "Budget Master", description: "Stay under budget across all categories for a full month.", unlocked: false, icon: "🎯" },
  { id: "ac-3", title: "Emergency Fund Complete", description: "Fund 3 months of emergency expenses.", unlocked: false, icon: "🛡️" },
  { id: "ac-4", title: "Double Threat", description: "Simultaneously increase investments and reduce shopping.", unlocked: true, unlockedAt: "2026-06-05", icon: "⚡" },
  { id: "ac-5", title: "Streak Starter", description: "Stay under budget for 5 consecutive days.", unlocked: true, unlockedAt: "2026-06-08", icon: "🔥" },
];

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [streaks, setStreaks] = useState({ current: 0, highest: 0 });
  const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);
  const [financialTwin, setFinancialTwin] = useState<FinancialTwin>({
    name: "Mitra Twin v1",
    personality: "Balanced Planner",
    riskTolerance: "medium",
    learningProgress: 0,
    insights: [
      "Welcome to PocketSaathi! Add your first transaction to calibrate your AI Financial Twin.",
      "Set up monthly category budgets to monitor and limit your expenses.",
      "Create a savings goal (like an Emergency Fund) to model future affordability.",
      "Track recurring subscriptions or bills to get proactive upcoming due reminders.",
    ],
  });
  
  const [healthScore, setHealthScore] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    id: string;
    email: string;
    name: string | null;
    onboardingComplete: boolean;
  } | null>(null);

  // Fetch all user details from database on mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const data = await getUserData();
        
        setIsDbConnected(true);
        setUserProfile({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          onboardingComplete: data.user.onboardingComplete,
        });
        setTransactions(data.transactions as any[]);
        setBudgets(data.budgets as any[]);
        setGoals(data.goals as any[]);
        setSubscriptions(data.subscriptions as any[]);
        setStreaks({
          current: data.user.streakCurrent,
          highest: data.user.streakHighest,
        });
        setFinancialTwin({
          name: data.user.twinName,
          personality: data.user.twinPersonality as any,
          riskTolerance: data.user.twinRisk as any,
          learningProgress: data.transactions.length > 0 ? 74 : 0,
          insights: generateTwinInsights(
            data.transactions as any[],
            data.budgets as any[],
            data.goals as any[],
            data.subscriptions as any[]
          ),
        });
        setHealthScore(data.user.healthScore);
      } catch (err: any) {
        console.warn("Could not connect to database pooler. Falling back to local sandbox state.", err.message);
        setIsDbConnected(false);
        if (clerkLoaded && clerkUser) {
          // The user is logged in, but database connection failed.
          // Fallback to a clean state with their actual profile details to prevent forcing onboarding
          setUserProfile({
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || "",
            name: clerkUser.fullName || null,
            onboardingComplete: true,
          });
          setTransactions([]);
          setBudgets([]);
          setGoals([]);
          setSubscriptions([]);
          setStreaks({ current: 0, highest: 0 });
          setHealthScore(100);
        } else {
          // Sandbox Mode (Guest fallback)
          setUserProfile({
            id: "sandbox-user",
            email: "sandbox@example.com",
            name: "Sandbox User",
            onboardingComplete: false,
          });
          // Fallback to rich sandbox mock data
          setTransactions(initialTransactions);
          setBudgets(initialBudgets);
          setGoals(initialGoals);
          setSubscriptions(initialSubscriptions);
          setStreaks({ current: 6, highest: 15 });
          setHealthScore(72);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    // Sync with HTML class
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Dynamic update of twin insights based on active transactions, budgets, goals, and subscriptions
  useEffect(() => {
    setFinancialTwin((prev) => ({
      ...prev,
      insights: generateTwinInsights(transactions, budgets, goals, subscriptions),
    }));
  }, [transactions, budgets, goals, subscriptions]);

  // Dynamic health score recalculation helper
  const recalculateHealthScore = (txs: Transaction[], bgts: Budget[], gls: SavingsGoal[]) => {
    const monthlyIncome = txs
      .filter((t) => t.type === "income" && isCurrentMonth(t.date))
      .reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = txs
      .filter((t) => t.type === "expense" && isCurrentMonth(t.date))
      .reduce((sum, t) => sum + t.amount, 0);

    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
    
    // Check overspending
    let overspentCategories = 0;
    bgts.forEach((b) => {
      const categorySpent = txs
        .filter((t) => t.type === "expense" && t.category === b.category && isCurrentMonth(t.date))
        .reduce((sum, t) => sum + t.amount, 0);
      if (categorySpent > b.limit) {
        overspentCategories++;
      }
    });

    const budgetDiscipline = bgts.length > 0 ? ((bgts.length - overspentCategories) / bgts.length) * 100 : 100;
    const goalProgressAverage = gls.length > 0 ? (gls.reduce((sum, g) => sum + (g.currentAmount / g.targetAmount), 0) / gls.length) * 100 : 50;

    const score = Math.round(
      Math.max(0, Math.min(100, (savingsRate * 0.4) + (budgetDiscipline * 0.4) + (goalProgressAverage * 0.2)))
    );
    const finalScore = score > 0 ? score : 55;
    
    setHealthScore(finalScore);

    // Sync back to profile if DB connected
    if (isDbConnected) {
      updateUserProfile({ healthScore: finalScore }).catch((e) => console.error(e));
    }
  };

  useEffect(() => {
    if (!isLoading) {
      recalculateHealthScore(transactions, budgets, goals);
    }
  }, [transactions, budgets, goals, isLoading]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const addTransaction = (tx: Omit<Transaction, "id">) => {
    if (tx.type === "expense") {
      const currentIncome = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const currentExpense = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
      const currentBalance = currentIncome - currentExpense;

      if (tx.amount > currentBalance) {
        alert(`Insufficient funds: Your remaining balance is ₹${currentBalance.toLocaleString()}, which is less than the transaction amount of ₹${tx.amount.toLocaleString()}.`);
        return;
      }
    }

    const tempId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newTx: Transaction = {
      ...tx,
      id: tempId,
    };
    
    // Optimistic Update
    setTransactions((prev) => [newTx, ...prev]);

    if (isDbConnected) {
      addTransactionAction(tx)
        .then((dbTx) => {
          // Replace temp ID with database ID
          setTransactions((prev) =>
            prev.map((t) => (t.id === tempId ? { ...t, id: dbTx.id } : t))
          );
        })
        .catch((e) => console.error("Database transaction add failed:", e));
    }

    // Auto-configure recommended budgets based on this income transaction if user has no budgets
    if (tx.type === "income" && budgets.length === 0 && tx.amount > 0) {
      const salary = tx.amount;
      const recommendedBudgets = [
        { category: "Food", limit: Math.round(salary * 0.15), period: "monthly" as const },
        { category: "Transport", limit: Math.round(salary * 0.08), period: "monthly" as const },
        { category: "Shopping", limit: Math.round(salary * 0.15), period: "monthly" as const },
        { category: "Entertainment", limit: Math.round(salary * 0.10), period: "monthly" as const },
        { category: "Utilities", limit: Math.round(salary * 0.10), period: "monthly" as const },
      ];
      recommendedBudgets.forEach((b) => addBudget(b));
    }
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    const oldTx = transactions.find((t) => t.id === id);
    if (oldTx) {
      const targetType = updates.type || oldTx.type;
      const targetAmount = updates.amount !== undefined ? updates.amount : oldTx.amount;

      if (targetType === "expense" || oldTx.type === "income") {
        let incomeSum = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        let expenseSum = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

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
          alert(`Insufficient funds: This update would result in a negative balance of ₹${prospectiveBalance.toLocaleString()}.`);
          return;
        }
      }
    }

    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );

    if (isDbConnected && !id.startsWith("tx-")) {
      updateTransactionAction(id, updates).catch((e) =>
        console.error("Database transaction update failed:", e)
      );
    }
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    if (isDbConnected && !id.startsWith("tx-")) {
      deleteTransactionAction(id).catch((e) =>
        console.error("Database transaction delete failed:", e)
      );
    }
  };

  const bulkDeleteTransactions = (ids: string[]) => {
    setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));

    if (isDbConnected) {
      const realIds = ids.filter((id) => !id.startsWith("tx-"));
      if (realIds.length > 0) {
        bulkDeleteTransactionsAction(realIds).catch((e) =>
          console.error("Database bulk transaction delete failed:", e)
        );
      }
    }
  };

  const addBudget = (b: Omit<Budget, "id">) => {
    const tempId = `b-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newB = { ...b, id: tempId };
    setBudgets((prev) => [...prev, newB]);

    if (isDbConnected) {
      addBudgetAction(b)
        .then((dbB) => {
          setBudgets((prev) =>
            prev.map((x) => (x.id === tempId ? { ...x, id: dbB.id } : x))
          );
        })
        .catch((e) => console.error("Database budget add failed:", e));
    }
  };

  const updateBudget = (id: string, limit: number) => {
    setBudgets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, limit } : b))
    );

    if (isDbConnected && !id.startsWith("b-")) {
      updateBudgetAction(id, limit).catch((e) =>
        console.error("Database budget update failed:", e)
      );
    }
  };

  const deleteBudget = (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));

    if (isDbConnected && !id.startsWith("b-")) {
      deleteBudgetAction(id).catch((e) =>
        console.error("Database budget delete failed:", e)
      );
    }
  };

  const addGoal = (g: Omit<SavingsGoal, "id">) => {
    const tempId = `g-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newG = { ...g, id: tempId };
    setGoals((prev) => [...prev, newG]);

    if (isDbConnected) {
      addGoalAction(g as any)
        .then((dbG) => {
          setGoals((prev) =>
            prev.map((x) => (x.id === tempId ? { ...x, id: dbG.id } : x))
          );
        })
        .catch((e) => console.error("Database goal add failed:", e));
    }
  };

  const contributeToGoal = (id: string, amount: number) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amount) }
          : g
      )
    );

    // Also add corresponding investment transaction optimistically
    const goalObj = goals.find((g) => g.id === id);
    if (goalObj) {
      const tempTxId = `tx-${Date.now()}`;
      const newTx: Transaction = {
        id: tempTxId,
        type: "expense",
        category: "Investments",
        subcategory: "Goals Contribution",
        amount,
        merchant: `Goal: ${goalObj.name}`,
        date: new Date().toISOString().split("T")[0],
        note: `Contribution to ${goalObj.name}`,
      };
      setTransactions((prev) => [newTx, ...prev]);

      if (isDbConnected && !id.startsWith("g-")) {
        contributeToGoalAction(id, amount)
          .then((dbG) => {
            // refresh data to align database IDs
            getUserData().then(d => {
              setTransactions(d.transactions as any[]);
              setGoals(d.goals as any[]);
            });
          })
          .catch((e) => console.error("Database goal contribution failed:", e));
      }
    }
  };

  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));

    if (isDbConnected && !id.startsWith("g-")) {
      deleteGoalAction(id).catch((e) =>
        console.error("Database goal delete failed:", e)
      );
    }
  };

  const addSubscription = (s: Omit<Subscription, "id">) => {
    const tempId = `s-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newS = { ...s, id: tempId };
    setSubscriptions((prev) => [...prev, newS]);

    if (isDbConnected) {
      addSubscriptionAction(s)
        .then((dbS) => {
          setSubscriptions((prev) =>
            prev.map((x) => (x.id === tempId ? { ...x, id: dbS.id } : x))
          );
        })
        .catch((e) => console.error("Database subscription add failed:", e));
    }
  };

  const deleteSubscription = (id: string) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));

    if (isDbConnected && !id.startsWith("s-")) {
      deleteSubscriptionAction(id).catch((e) =>
        console.error("Database subscription delete failed:", e)
      );
    }
  };

  const updateSubscription = (id: string, updatedFields: Partial<Subscription>) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updatedFields } : s))
    );

    if (isDbConnected && !id.startsWith("s-")) {
      updateSubscriptionAction(id, updatedFields).catch((e) =>
        console.error("Database subscription update failed:", e)
      );
    }
  };

  const updateTwinPersonality = (personality: FinancialTwin["personality"]) => {
    setFinancialTwin((prev) => ({
      ...prev,
      personality,
      insights: [
        `Adjusting behavior. You are now running the twin in '${personality}' mode.`,
        ...prev.insights.slice(1),
      ],
    }));

    if (isDbConnected) {
      updateUserProfile({ twinPersonality: personality }).catch((e) =>
        console.error("Database twin update failed:", e)
      );
    }
  };

  const setInitialSetup = async (
    salary: number,
    autoBudget: boolean,
    useSandbox: boolean,
    firstName?: string,
    lastName?: string
  ) => {
    setIsLoading(true);
    
    // Call server action first if DB connected
    if (isDbConnected && !useSandbox) {
      try {
        await setupInitialUserAction(salary, autoBudget, false, firstName, lastName);
        const data = await getUserData();
        setUserProfile({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          onboardingComplete: data.user.onboardingComplete,
        });
        setTransactions(data.transactions as any[]);
        setBudgets(data.budgets as any[]);
        setGoals(data.goals as any[]);
        setSubscriptions(data.subscriptions as any[]);
        setStreaks({ current: salary > 0 ? 1 : 0, highest: salary > 0 ? 1 : 0 });
        setHealthScore(data.user.healthScore);
      } catch (err) {
        console.error("Failed setting up user in database, falling back locally:", err);
      }
    } else {
      // Local setup or sandbox setup
      setUserProfile({
        id: "local-user",
        email: "local@example.com",
        name: `${firstName || ""} ${lastName || ""}`.trim() || "Local User",
        onboardingComplete: true,
      });
      if (useSandbox) {
        setTransactions(initialTransactions);
        setBudgets(initialBudgets);
        setGoals(initialGoals);
        setSubscriptions(initialSubscriptions);
        setStreaks({ current: 6, highest: 15 });
        setAchievements(initialAchievements);
      } else {
        if (salary > 0) {
          const initialTx: Transaction = {
            id: `tx-${Date.now()}`,
            type: "income",
            category: "Salary",
            amount: salary,
            merchant: "Monthly In-Hand Salary",
            date: new Date().toISOString().split("T")[0],
            note: "Initial base salary setup",
          };
          setTransactions([initialTx]);
          setStreaks({ current: 1, highest: 1 });
        } else {
          setTransactions([]);
          setStreaks({ current: 0, highest: 0 });
        }
        setGoals([]);
        setSubscriptions([]);
        setAchievements(initialAchievements.map(ac => ({ ...ac, unlocked: false })));
        
        if (autoBudget && salary > 0) {
          setBudgets([
            { id: `b-${Date.now()}-1`, category: "Food", limit: Math.round(salary * 0.15), period: "monthly" },
            { id: `b-${Date.now()}-2`, category: "Transport", limit: Math.round(salary * 0.08), period: "monthly" },
            { id: `b-${Date.now()}-3`, category: "Shopping", limit: Math.round(salary * 0.15), period: "monthly" },
            { id: `b-${Date.now()}-4`, category: "Entertainment", limit: Math.round(salary * 0.10), period: "monthly" },
            { id: `b-${Date.now()}-5`, category: "Utilities", limit: Math.round(salary * 0.10), period: "monthly" },
          ]);
        } else {
          setBudgets([]);
        }
      }
    }
    
    setIsLoading(false);
  };

  return (
    <FinanceContext.Provider
      value={{
        theme,
        toggleTheme,
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        bulkDeleteTransactions,
        budgets,
        addBudget,
        updateBudget,
        deleteBudget,
        goals,
        addGoal,
        contributeToGoal,
        deleteGoal,
        subscriptions,
        addSubscription,
        deleteSubscription,
        updateSubscription,
        streaks,
        achievements,
        financialTwin,
        updateTwinPersonality,
        healthScore,
        setInitialSetup,
        isLoading,
        isDbConnected,
        userProfile,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
};
