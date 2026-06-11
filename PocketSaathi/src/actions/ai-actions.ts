"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "../lib/prisma";

export async function callGeminiCoachAction(
  query: string,
  transactions: any[],
  budgets: any[],
  goals: any[],
  subscriptions?: any[]
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Google Gemini API Key is not configured on the server. Please add GEMINI_API_KEY to your .env file.");
  }

  // Pre-calculate basic aggregates to give the LLM perfect math data
  const incomeTotal = transactions
  .filter((t) => t.type === "income")
  .reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = transactions
  .filter((t) => t.type === "expense")
  .reduce((sum, t) => sum + t.amount, 0);
  const netSavings = incomeTotal - expenseTotal;

  const prompt = `
You are the PocketSaathi AI Coach, a friendly, professional personal CFO assistant.
The user is asking: "${query}"

Here is their current financial context (calculated from their secure database ledger):
- Current Net Savings: ₹${netSavings.toLocaleString()}
- Monthly Income: ₹${incomeTotal.toLocaleString()}
- Monthly Outflow (Expense): ₹${expenseTotal.toLocaleString()}

Active Budgets Configured:
${budgets.length === 0 ? "- None" : budgets.map((b) => `- ${b.category}: Limit ₹${b.limit.toLocaleString()}/month`).join("\n")}

Active Savings Goals:
${goals.length === 0 ? "- None" : goals.map((g) => `- ${g.name}: Target ₹${g.targetAmount.toLocaleString()}, Saved ₹${g.currentAmount.toLocaleString()}, Deadline ${g.deadline} (Category: ${g.category})`).join("\n")}

Active Recurring Bills / EMIs:
${!subscriptions || subscriptions.length === 0 ? "- None" : subscriptions.map((s) => `- ${s.name}: ₹${s.amount}/${s.frequency} (Due: ${s.nextBillingDate || "N/A"})`).join("\n")}

Please analyze their query conversationally. 
- IMPORTANT: If the user's query is completely unrelated to personal finance, budgeting, wealth management, saving, or financial planning, politely decline to answer. State clearly that you are a personal finance assistant and can only help with financial questions.
- If they ask for advice, savings strategies, or suggestions, offer concrete steps based on their net savings and goals.
- If they ask about buying something (e.g. bike, phone), calculate the exact impact on their net savings and their goals (e.g. how many days it will delay their emergency fund milestone).
- Give structured bullet points where helpful.
- Keep your answers highly readable, concise, and focused on helping them understand and grow their wealth.
- Be friendly, encouraging, and clear.
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error details:", errorText);
      throw new Error(`Gemini API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) {
      throw new Error("Empty response received from Gemini AI model.");
    }

    return { message: replyText };
  } catch (err: any) {
    console.error("Error inside callGeminiCoachAction server action:", err.message);
    throw err;
  }
}

export async function parseReceiptAction(base64Data: string, mimeType: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Google Gemini API Key is not configured on the server. Please add GEMINI_API_KEY to your .env file.");
  }

  let cleanBase64 = base64Data;
  if (base64Data.includes(";base64,")) {
    cleanBase64 = base64Data.split(";base64,")[1];
  }

  const currentDate = new Date().toISOString().split("T")[0];
  const prompt = `You are an AI financial receipt and payment parser. Analyze the uploaded image or PDF document.
This document could be a retail store receipt, an invoice, or a UPI payment success screenshot (e.g., Google Pay, PhonePe, Paytm, BHIM, or mobile banking screenshots).

Extract the following transaction details and return them in structured format:
1. Merchant name (field "merchant") - For receipts: e.g. "Starbucks", "Amazon". For UPI screenshots: detect the recipient/merchant paid to (e.g. "Mohan Grocery Store", "Zomato", or the name/business name shown in the UPI screen).
2. Total transaction amount as a number (field "amount") - e.g. 450.50 (strip currency symbols and commas).
3. Transaction date in YYYY-MM-DD format (field "date"). If no date is found on the receipt/screenshot, use the current date which is "${currentDate}".
4. Category of expense (field "category"). This must map strictly to one of: "Food", "Shopping", "Transport", "Entertainment", "Utilities", "Other".
5. A simple one-word subcategory (field "subcategory") - e.g. "Dining", "Coffee", "Gadgets", "Rent", "Grocery", "Electricity".
6. A concise one-sentence description note listing what was purchased or the payment channel (field "note") - e.g. "UPI Payment to Zomato via GPay".
7. A list of 1 to 3 relevant lowercase tags (field "tags") - e.g. ["upi", "gpay", "food"] or ["ocr", "shopping"].

Output the result strictly as a valid JSON object matching this schema:
{
  "type": "expense",
  "category": "Food" | "Shopping" | "Transport" | "Entertainment" | "Utilities" | "Other",
  "subcategory": "string",
  "amount": number,
  "merchant": "string",
  "date": "string",
  "note": "string",
  "tags": ["string"]
}`;

  try {
    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini OCR API Error details:", errorText);
      throw new Error(`Gemini OCR API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) {
      throw new Error("No structured output returned from Gemini AI OCR.");
    }

    const parsed = JSON.parse(jsonText.trim());

    return {
      type: parsed.type || "expense",
      category: parsed.category || "Other",
      subcategory: parsed.subcategory || "General",
      amount: typeof parsed.amount === "number" ? parsed.amount : parseFloat(parsed.amount) || 0,
      merchant: parsed.merchant || "Unknown Merchant",
      date: parsed.date || currentDate,
      note: parsed.note || "OCR Scanned receipt",
      tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: any) => String(t).toLowerCase()) : ["ocr"],
    };
  } catch (err: any) {
    console.error("Error inside parseReceiptAction server action:", err.message);
    throw err;
  }
}

export async function generateMonthlyReportAction(
  transactions: any[],
  budgets: any[],
  monthName: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Google Gemini API Key is not configured on the server. Please add GEMINI_API_KEY to your .env file.");
  }

  // Pre-calculate aggregate math for Gemini to prevent LLM hallucination
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Budget calculations
  let overspentCount = 0;
  const budgetUtilization = budgets.map((b) => {
    const spent = transactions
      .filter((t) => t.type === "expense" && t.category === b.category)
      .reduce((sum, t) => sum + t.amount, 0);
    if (spent > b.limit) overspentCount++;
    return {
      category: b.category,
      limit: b.limit,
      spent: spent,
      percent: b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0,
    };
  });

  const prompt = `You are a professional financial Twin and wealth planner.
Generate a comprehensive financial health score and audit report for the month of "${monthName}" based on the user's spending habits.

Here is the user's secure ledger data for "${monthName}":
- Total Income logged: ₹${totalIncome.toLocaleString()}
- Total Expenses logged: ₹${totalExpense.toLocaleString()}
- Net Savings: ₹${netSavings.toLocaleString()}
- Savings Rate: ${savingsRate.toFixed(1)}%
- Active Budgets & Spent Amounts:
${budgetUtilization.map((bu) => `  * Category ${bu.category}: Limit ₹${bu.limit.toLocaleString()}, Spent ₹${bu.spent.toLocaleString()} (${bu.percent}% used)`).join("\n")}
- Overspent Categories: ${overspentCount}

Using these details, perform a deep financial health scoring check.
1. Financial Score (like a credit rating): Scale it from 300 (minimum) to 900 (maximum). Set it based on savings rate (higher is better, 30%+ savings rate gets high score), budget discipline (overspending categories reduces score severely), and balance.
2. Rating Category: Label the score as "Poor" (300-549), "Fair" (550-649), "Good" (650-749), or "Excellent" (750-900).
3. Summary: Provide a 2-3 sentence overview of their financial habits last month.
4. Key Areas of Improvement: List 3 specific bullet points describing where they overspent or wasted money.
5. Score Improvement Tips: List 3 action items they must follow next month to improve their score.

Return the response strictly as a valid JSON object matching this schema:
{
  "score": number,
  "rating": "Excellent" | "Good" | "Fair" | "Poor",
  "summary": "string",
  "improvements": ["string"],
  "nextMonthTips": ["string"]
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini Report API Error details:", errorText);
      throw new Error(`Gemini Report API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) {
      throw new Error("No structured output returned from Gemini AI Report.");
    }

    return JSON.parse(jsonText.trim());
  } catch (err: any) {
    console.error("Error inside generateMonthlyReportAction server action:", err.message);
    throw err;
  }
}

export async function parseVoiceCommandAction(transcript: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Google Gemini API Key is not configured on the server. Please add GEMINI_API_KEY to your .env file.");
  }

  const currentDate = new Date().toISOString().split("T")[0];
  const prompt = `You are an AI financial voice assistant. Parse the following spoken expense or income statement:
"${transcript}"

Extract the following transaction details and return them in structured format:
1. Merchant name (field "merchant") - e.g. "Starbucks", "Zomato", "Mohan", "Decathlon". If no clear merchant is specified, use "Cash Expense" or a generic name.
2. Transaction type (field "type") - must be either "income" (for salary, earnings, cash gifts) or "expense" (for spending, purchases, payments).
3. Total amount as a number (field "amount") - e.g. 350 (interpret numbers spoken in words like "two hundred" to 200, or "fifty rupees" to 50).
4. Transaction date in YYYY-MM-DD format (field "date"). If no date is spoken, use the current date which is "${currentDate}".
5. Category of transaction (field "category"). This must map strictly to one of: "Food", "Shopping", "Transport", "Entertainment", "Utilities", "Other" (or "Salary" if type is income).
6. A simple one-word subcategory (field "subcategory") - e.g. "Dining", "Coffee", "Gadgets", "Rent", "Grocery", "Electricity".
7. A concise one-sentence description note (field "note") - e.g. "Spoken Entry: Spent 350 rupees on lunch".
8. A list of 1 to 3 relevant lowercase tags (field "tags") - e.g. ["voice", "food"].

Output the result strictly as a valid JSON object matching this schema:
{
  "type": "income" | "expense",
  "category": "Food" | "Shopping" | "Transport" | "Entertainment" | "Utilities" | "Other" | "Salary",
  "subcategory": "string",
  "amount": number,
  "merchant": "string",
  "date": "string",
  "note": "string",
  "tags": ["string"]
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini Voice API Error details:", errorText);
      throw new Error(`Gemini Voice API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) {
      throw new Error("No structured output returned from Gemini AI Voice parser.");
    }

    const parsed = JSON.parse(jsonText.trim());
    return {
      type: parsed.type || "expense",
      category: parsed.category || "Other",
      subcategory: parsed.subcategory || "General",
      amount: typeof parsed.amount === "number" ? parsed.amount : parseFloat(parsed.amount) || 0,
      merchant: parsed.merchant || "Voice Entry",
      date: parsed.date || currentDate,
      note: parsed.note || `Voice: "${transcript}"`,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: any) => String(t).toLowerCase()) : ["voice"],
    };
  } catch (err: any) {
    console.error("Error inside parseVoiceCommandAction server action:", err.message);
    throw err;
  }
}



