import { Transaction, Budget, SavingsGoal } from "../context/finance-context";

export interface AIResponse {
  message: string;
  suggestedAction?: {
    type: "create_budget" | "add_transaction" | "adjust_goal" | "none";
    payload?: any;
  };
}

export const processAIChatQuery = (
  query: string,
  transactions: Transaction[],
  budgets: Budget[],
  goals: SavingsGoal[]
): AIResponse => {
  const q = query.toLowerCase();

  // 1. Get Statement
  if (q.includes("statement") || q === "get statement") {
    const lastTxs = transactions.slice(0, 5);
    const txList = lastTxs
      .map(
        (t) =>
          `• ${t.date}: ${t.merchant} (${t.category}) — ${
            t.type === "income" ? "+" : "-"
          }₹${t.amount.toLocaleString()}`
      )
      .join("\n");
    return {
      message: `Here is your recent financial statement (last 5 transactions):\n\n${
        txList || "No transactions recorded yet."
      }\n\nFor your full ledger, please navigate to the Ledger tab.`,
    };
  }

  // 2. Graphical Representation of category spending
  if (
    q.includes("graphical") ||
    q.includes("representation") ||
    q.includes("chart") ||
    q.includes("graph")
  ) {
    const categoryTotals: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

    const totalExpense = Object.values(categoryTotals).reduce((sum, amt) => sum + amt, 0);

    if (totalExpense === 0) {
      return {
        message: "You have no expense transactions logged to generate a graphical representation.",
      };
    }

    const chartLines = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => {
        const pct = Math.round((amt / totalExpense) * 100);
        const barLength = Math.round(pct / 10);
        const bar = "█".repeat(barLength) + "░".repeat(10 - barLength);
        return `${cat.padEnd(12)} : ${bar}  ${pct}%  (₹${amt.toLocaleString()})`;
      });

    return {
      message: `Here is a graphical representation of your expenses by category:\n\n\`\`\`\n${chartLines.join(
        "\n"
      )}\n\`\`\`\nTotal Outflow: ₹${totalExpense.toLocaleString()}`,
    };
  }

  // 3. Calculate food spending
  if (q.includes("food") || q.includes("dining") || q.includes("eat")) {
    const foodTx = transactions.filter(
      (t) => t.category.toLowerCase() === "food" && t.type === "expense"
    );
    const total = foodTx.reduce((sum, t) => sum + t.amount, 0);
    return {
      message: `You have spent a total of ₹${total.toLocaleString()} on food and dining this month across ${foodTx.length} transactions. Your largest single food expense was ₹${Math.max(...foodTx.map((t) => t.amount), 0).toLocaleString()} at ${foodTx[0]?.merchant || "Swiggy"}.`,
    };
  }

  // 2. Spending above specific amount
  if (q.includes("above") || q.includes("greater than") || q.includes(">")) {
    const amountMatch = q.match(/\d+/);
    if (amountMatch) {
      const minAmount = parseInt(amountMatch[0]);
      const highTxs = transactions.filter(
        (t) => t.type === "expense" && t.amount > minAmount
      );
      const list = highTxs.map((t) => `${t.merchant} (₹${t.amount})`).slice(0, 3).join(", ");
      return {
        message: `I found ${highTxs.length} expenses above ₹${minAmount.toLocaleString()}. The top ones are: ${list || "none"}. ${highTxs.length > 3 ? "and others." : ""}`,
      };
    }
  }

  // 3. Category comparison / top spending
  if (q.includes("top spending") || q.includes("categories") || q.includes("where do i spend")) {
    const categoryTotals: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const topStr = sorted
      .slice(0, 3)
      .map(([cat, val]) => `${cat}: ₹${val.toLocaleString()}`)
      .join("\n• ");

    return {
      message: `Your top 3 spending categories this month are:\n• ${topStr || "No expenses recorded yet."}\n\nI recommend setting a category budget for the top items to curb impulsive habits.`,
    };
  }

  // 4. Can I afford X
  if (q.includes("afford") || q.includes("buy")) {
    const itemMatch = q.match(/(?:afford|buy)\s+(?:a|an)?\s*([a-zA-Z0-9\s]+?)(?:\s+for\s+|\s+of\s+|\s+priced\s+at\s+|\s+at\s+)?₹?\$?(\d+)/i) || 
                       q.match(/(?:afford|buy)\s+₹?\$?(\d+)\s*(?:for\s+)?(?:a|an)?\s*([a-zA-Z0-9\s]+)/i);

    let price = 0;
    let item = "this purchase";
    
    if (itemMatch) {
      if (isNaN(Number(itemMatch[1]))) {
        item = itemMatch[1].trim();
        price = parseInt(itemMatch[2]);
      } else {
        price = parseInt(itemMatch[1]);
        item = itemMatch[2].trim();
      }
    } else {
      // Fallback number matching
      const numMatch = q.match(/\d+/g);
      if (numMatch && numMatch.length > 0) {
        price = parseInt(numMatch[0]);
      }
    }

    if (price > 0) {
      const income = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const expense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
      const netSavings = income - expense;

      if (price > netSavings * 3) {
        return {
          message: `Buying "${item}" for ₹${price.toLocaleString()} is not recommended right now. It exceeds 3 months of your current net savings rate (₹${netSavings.toLocaleString()}/mo). It could delay your Emergency Fund milestone by about ${(price / (netSavings || 1) * 30).toFixed(0)} days.`,
          suggestedAction: {
            type: "create_budget",
            payload: { category: "Shopping", limit: Math.max(2000, netSavings * 0.15) }
          }
        };
      } else {
        return {
          message: `Yes, you can afford "${item}" (₹${price.toLocaleString()}). It is well within your monthly disposable buffer. If you purchase this, your savings rate for the month will adjust to ${(((netSavings - price) / (income || 1)) * 100).toFixed(1)}%.`,
        };
      }
    }

    return {
      message: "To tell you if you can afford it, please provide the price. E.g., 'Can I afford a laptop for ₹65000?'",
    };
  }

  // 5. General AI Advice / Financial Health
  if (q.includes("healthy") || q.includes("health score") || q.includes("how am i doing")) {
    const income = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const rate = income > 0 ? ((income - expense) / income) * 100 : 0;
    
    return {
      message: `Your Financial Health Score is looking stable at 72/100. Your savings rate this month is ${rate.toFixed(1)}% (Target: >30%). You have 3 active savings goals with average completion rate of 42%. To improve further, resolve the Swiggy duplicate charge and avoid entertainment spikes.`,
    };
  }

  // Fallback default response
  return {
    message: `Hello! I'm your PocketSaathi Financial Twin. I process transactions and aggregates locally with zero latency. You can ask me to:
• Calculate category spending (e.g. 'How much did I spend on food?')
• Search transaction records (e.g. 'Show transactions above ₹2000')
• Analyze top spending categories (e.g. 'Where do I spend?')`,
  };
};

// OCR receipt extraction simulation
export const simulateReceiptOCR = (fileName: string): Promise<Omit<Transaction, "id">> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Return a simulated structured transaction based on standard receipt type
      const dateStr = new Date().toISOString().split("T")[0];
      if (fileName.toLowerCase().includes("starbucks") || fileName.toLowerCase().includes("coffee")) {
        resolve({
          type: "expense",
          category: "Food",
          subcategory: "Coffee",
          amount: 380,
          merchant: "Starbucks Coffee",
          date: dateStr,
          note: "OCR Scanned: Caramel Macchiato",
          tags: ["ocr", "beverages"],
        });
      } else if (fileName.toLowerCase().includes("amazon") || fileName.toLowerCase().includes("bill")) {
        resolve({
          type: "expense",
          category: "Shopping",
          subcategory: "Gadgets",
          amount: 1450,
          merchant: "Amazon Cloudtail",
          date: dateStr,
          note: "OCR Scanned: USB-C Hub Adapter",
          tags: ["ocr-import"],
        });
      } else {
        // Generic receipt
        resolve({
          type: "expense",
          category: "Shopping",
          subcategory: "Retail",
          amount: 890,
          merchant: "Decathlon Sports",
          date: dateStr,
          note: "OCR Scanned receipt",
          tags: ["ocr"],
        });
      }
    }, 2000); // 2 second delay to simulate scanning animation
  });
};

// Voice command parsing simulation
export const parseVoiceCommand = (transcript: string): Omit<Transaction, "id"> | null => {
  const t = transcript.toLowerCase();
  
  // Format: "Spent 350 rupees on lunch" or "spent 1200 on petrol" or "got 5000 salary"
  const amountMatch = t.match(/(\d+)\s*(?:rupees|rs|bucks|inr)?/);
  if (!amountMatch) return null;
  const amount = parseInt(amountMatch[1]);
  
  let category = "Shopping";
  let subcategory = "General";
  let merchant = "Voice Entry";
  let type: "income" | "expense" = "expense";

  if (t.includes("lunch") || t.includes("food") || t.includes("dinner") || t.includes("breakfast") || t.includes("burger") || t.includes("pizza")) {
    category = "Food";
    subcategory = "Dining";
    merchant = t.includes("zomato") ? "Zomato" : t.includes("swiggy") ? "Swiggy" : "Local Restaurant";
  } else if (t.includes("uber") || t.includes("cab") || t.includes("taxi") || t.includes("petrol") || t.includes("fuel") || t.includes("metro")) {
    category = "Transport";
    subcategory = t.includes("petrol") ? "Fuel" : "Cabs";
    merchant = t.includes("uber") ? "Uber" : t.includes("ola") ? "Ola" : "Petrol Pump";
  } else if (t.includes("netflix") || t.includes("spotify") || t.includes("movie") || t.includes("cinema") || t.includes("game")) {
    category = "Entertainment";
    subcategory = "Recreation";
    merchant = t.includes("netflix") ? "Netflix" : "Cinema Mall";
  } else if (t.includes("salary") || t.includes("earned") || t.includes("income") || t.includes("received")) {
    type = "income";
    category = "Salary";
    merchant = "Direct Deposit";
  }
  
  return {
    type,
    category,
    subcategory,
    amount,
    merchant,
    date: new Date().toISOString().split("T")[0],
    note: `Voice Log: "${transcript}"`,
    tags: ["voice-entry"],
  };
};



// AI Budget recommendations helper
export const getAIBudgetRecommendations = (transactions: Transaction[]): Omit<Budget, "id">[] => {
  const categoryTotals: Record<string, number> = {};
  
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    
  return Object.entries(categoryTotals).map(([category, amt]) => {
    // Recommend a budget that is 10% lower than their actual spending to encourage saving, rounded
    const recLimit = Math.round((amt * 0.9) / 500) * 500;
    return {
      category,
      limit: Math.max(1000, recLimit),
      period: "monthly",
    };
  });
};
