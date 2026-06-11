"use client";

import React, { useState } from "react";
import { useFinance, Transaction, Budget, SavingsGoal, isCurrentMonth } from "../context/finance-context";
import {
  processAIChatQuery,
  getAIBudgetRecommendations,
} from "../services/ai-service";
import { callGeminiCoachAction, generateMonthlyReportAction } from "../actions/ai-actions";
import { DashboardLayout } from "../components/dashboard-layout";
import { useUser } from "@clerk/nextjs";
import { GlassCard } from "../components/ui/glass-card";
import { DynamicChart } from "../components/ui/dynamic-chart";
import { VoiceWidget } from "../components/ui/voice-widget";
import { ReceiptScanner } from "../components/ui/receipt-scanner";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  Download,
  Calendar,
  Sparkles,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Play,
  Send,
  User,
  Shield,
  HelpCircle,
  Check,
  ChevronRight,
  Sparkle,
  Mic,
  CreditCard,
  CalendarDays,
  RefreshCw,
} from "lucide-react";


export default function App() {
  const { user } = useUser();
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [salaryInput, setSalaryInput] = useState("75000");
  const [autoBudgets, setAutoBudgets] = useState(true);

  // User name input states for onboarding
  const [firstNameInput, setFirstNameInput] = useState("");
  const [lastNameInput, setLastNameInput] = useState("");

  const {
    transactions,
    addTransaction,
    deleteTransaction,
    bulkDeleteTransactions,
    budgets,
    addBudget,
    updateBudget,
    goals,
    contributeToGoal,
    addGoal,
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
  } = useFinance();

  // Modal controls
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  
  // Transaction Form state
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [txAmount, setTxAmount] = useState("");
  const [txMerchant, setTxMerchant] = useState("");
  const [txCategory, setTxCategory] = useState("Food");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txNote, setTxNote] = useState("");

  // Goal Form state
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalCategory, setGoalCategory] = useState<any>("Emergency Fund");
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);

  // Budget Form state
  const [budgetCategory, setBudgetCategory] = useState("Food");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);

  // Reusable custom prompt modal state
  const [customPrompt, setCustomPrompt] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    defaultValue: string;
    inputType: "text" | "number";
    onConfirm: (value: string) => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    defaultValue: "",
    inputType: "text",
    onConfirm: () => {},
  });

  const [promptValue, setPromptValue] = useState("");

  const openPrompt = (config: {
    title: string;
    description?: string;
    defaultValue: string;
    inputType: "text" | "number";
    onConfirm: (value: string) => void;
  }) => {
    setCustomPrompt({
      isOpen: true,
      title: config.title,
      description: config.description,
      defaultValue: config.defaultValue,
      inputType: config.inputType,
      onConfirm: config.onConfirm,
    });
    setPromptValue(config.defaultValue);
  };

  const closePrompt = () => {
    setCustomPrompt(prev => ({ ...prev, isOpen: false }));
    setPromptValue("");
  };

  // Bills & EMIs state
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billType, setBillType] = useState<"EMI" | "Subscription" | "Utility Bill">("Subscription");
  const [billFrequency, setBillFrequency] = useState<"monthly" | "yearly">("monthly");
  const [billDueDate, setBillDueDate] = useState(new Date().toISOString().split("T")[0]);

  // Search & Filter state for Transactions tab
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");

  // Helper matching for timeframe filters
  const matchesTimeframe = (dateStr: string) => {
    const today = new Date();
    const txDate = new Date(dateStr);
    if (isNaN(txDate.getTime())) return true;
    
    if (timeframe === "monthly") {
      return txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
    }
    if (timeframe === "quarterly") {
      const diffDays = (today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 90;
    }
    if (timeframe === "half-yearly") {
      const diffDays = (today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 180;
    }
    if (timeframe === "yearly") {
      return txDate.getFullYear() === today.getFullYear();
    }
    return true;
  };

  // Filtered and sorted transactions list
  const processedTransactions = transactions
    .filter((t) => {
      const matchesSearch =
        t.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === "all" || t.category === filterCategory;
      const matchesType = filterType === "all" || t.type === filterType;
      return matchesSearch && matchesCategory && matchesType && matchesTimeframe(t.date);
    })
    .sort((a, b) => {
      if (sortBy === "date-desc") return b.date.localeCompare(a.date);
      if (sortBy === "date-asc") return a.date.localeCompare(b.date);
      if (sortBy === "amount-desc") return b.amount - a.amount;
      if (sortBy === "amount-asc") return a.amount - b.amount;
      return 0;
    });



  React.useEffect(() => {
    if (user) {
      setFirstNameInput(user.firstName || "");
      setLastNameInput(user.lastName || "");
    }
  }, [user]);

  React.useEffect(() => {
    if (!isLoading && userProfile?.onboardingComplete) {
      setShowLanding(false);
      setShowOnboarding(false);
    }
  }, [isLoading, userProfile]);

  // AI Monthly Twin Report state
  const [loadingReport, setLoadingReport] = useState(false);
  const [monthlyReport, setMonthlyReport] = useState<any | null>(null);

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    try {
      const today = new Date();
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const monthName = lastMonthDate.toLocaleString("en-US", { month: "long", year: "numeric" });
      
      const lastMonthTxs = transactions.filter(t => {
        const d = new Date(t.date);
        return !isNaN(d.getTime()) && 
               d.getMonth() === lastMonthDate.getMonth() && 
               d.getFullYear() === lastMonthDate.getFullYear();
      });

      const report = await generateMonthlyReportAction(lastMonthTxs, budgets, monthName);
      setMonthlyReport(report);
    } catch (e: any) {
      console.error("Report generation failed:", e);
      alert(`Could not generate financial report: ${e.message || e}`);
    } finally {
      setLoadingReport(false);
    }
  };

  // AI Chat Coach state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "coach"; text: string }>>([
    {
      sender: "coach",
      text: "Hi Raj! I am your PocketSaathi AI Coach. Ask me anything about your current budget, recent Swiggy transactions, or whether you can afford an upcoming purchase!",
    },
  ]);



  // Contribution slider state
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState("5000");

  // General calculated metrics
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const assetsTotal = goals.reduce((sum, g) => sum + g.currentAmount, 0) + 48000; // liquid cash + goal funds
  const liabilitiesTotal = subscriptions.reduce((sum, s) => sum + s.amount * (s.frequency === "monthly" ? 12 : 1), 0); // capitalized annual sub liabilities for tracking
  const netWorth = assetsTotal; // net worth estimation for demo

  // Filter active recurring bills due within the next 7 days
  const getUpcomingBills = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);
    
    return subscriptions
      .filter((s) => {
        if (s.status !== "active" || !s.nextBillingDate) return false;
        const due = new Date(s.nextBillingDate);
        due.setHours(0, 0, 0, 0);
        return !isNaN(due.getTime()) && due >= today && due <= sevenDaysLater;
      })
      .sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime());
  };

  const upcomingBills = getUpcomingBills();

  // Dynamic spending categories data for Recharts Pie
  const getCategorySpending = () => {
    const categories: Record<string, number> = {};
    const expenseTxs = transactions.filter((t) => t.type === "expense");
    
    expenseTxs.forEach((t) => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const total = Object.values(categories).reduce((s, v) => s + v, 0);
    
    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }));
  };

  const spendingChartData = getCategorySpending();
  const spendingColors = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1"];

  // Monthly trends data (Income vs Expense bar chart)
  const monthlyTrendsData = [
    { name: "Mar", income: 75000, expense: 58000 },
    { name: "Apr", income: 82000, expense: 59000 },
    { name: "May", income: 80000, expense: 62000 },
    { name: "Jun", income: totalIncome, expense: totalExpense },
  ];

  // OCR/Voice success triggers
  const handleOcrSuccess = () => {
    setShowOcrModal(false);
  };
  const handleVoiceSuccess = () => {
    setShowVoiceModal(false);
  };

  // Preset Click immediate submit
  const handlePresetClick = (p: string) => {
    setChatInput(p);
    setTimeout(() => {
      const form = document.getElementById("chat-form") as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }, 50);
  };

  // Chat submit
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setChatInput("");

    const q = userText.toLowerCase();
    const isPlanningQuery = 
      q.includes("afford") || 
      q.includes("buy") || 
      q.includes("plan") || 
      q.includes("future") || 
      q.includes("forecast") || 
      q.includes("sip") || 
      q.includes("bike") || 
      q.includes("car") || 
      q.includes("save") || 
      q.includes("invest") || 
      q.includes("habit") || 
      q.includes("advice") || 
      q.includes("recommend");

    if (isPlanningQuery) {
      setChatMessages((prev) => [...prev, { sender: "coach", text: "PocketSaathi AI Coach is analyzing your transactions and projecting goals..." }]);
      try {
        const response = await callGeminiCoachAction(userText, transactions, budgets, goals, subscriptions);
        setChatMessages((prev) => {
          const copy = [...prev];
          for (let i = copy.length - 1; i >= 0; i--) {
            if (copy[i].sender === "coach") {
              copy[i].text = response.message;
              break;
            }
          }
          return copy;
        });
      } catch (err: any) {
        setChatMessages((prev) => {
          const copy = [...prev];
          for (let i = copy.length - 1; i >= 0; i--) {
            if (copy[i].sender === "coach") {
              copy[i].text = `Failed to contact AI Coach: ${err.message || err}. Please check your connection or GEMINI_API_KEY.`;
              break;
            }
          }
          return copy;
        });
      }
    } else {
      setTimeout(() => {
        const response = processAIChatQuery(userText, transactions, budgets, goals);
        setChatMessages((prev) => [...prev, { sender: "coach", text: response.message }]);
        
        if (response.suggestedAction?.type === "create_budget") {
          setBudgetCategory(response.suggestedAction.payload.category);
          setBudgetLimit(response.suggestedAction.payload.limit.toString());
        }
      }, 400);
    }
  };

  // CSV Export simulator
  const handleExportCSV = () => {
    const headers = "ID,Type,Category,Merchant,Amount,Date,Note,Tags\n";
    const rows = transactions
      .map((t) => `${t.id},${t.type},${t.category},"${(t.merchant || "").replace(/"/g, '""').replace(/₹/g, "Rs.")}",${t.amount},${t.date},"${(t.note || "").replace(/"/g, '""').replace(/₹/g, "Rs.")}",${(t.tags || []).join(";")}`)
      .join("\n");
    
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pocketsaathi_transactions.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // PDF Export
  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Centered Brand Header (Logo)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(79, 70, 229); // Brand primary color (indigo-600)
      const brandText = "PocketSaathi";
      const brandTextWidth = doc.getTextWidth(brandText);
      doc.text(brandText, (pageWidth - brandTextWidth) / 2, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139); // Slate-500
      const subtitleText = "Personal Finance & Wealth Twin";
      const subtitleWidth = doc.getTextWidth(subtitleText);
      doc.text(subtitleText, (pageWidth - subtitleWidth) / 2, 26);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text("Financial Ledger Statement", 14, 38);
      
      // User Profile metadata info
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85); // Slate-700
      
      const userName = userProfile?.name || user?.fullName || "Mitra User";
      doc.text(`User Name: ${userName}`, 14, 46);
      
      // Calculate user salary (from transactions of category "Salary")
      const salaryTx = transactions.find(t => t.type === "income" && t.category.toLowerCase() === "salary");
      const salaryAmount = salaryTx ? salaryTx.amount : 0;
      doc.text(`Monthly Salary: INR ${salaryAmount.toLocaleString()}`, 14, 52);
      
      doc.text(`Generated On: ${new Date().toLocaleDateString("en-IN")} ${new Date().toLocaleTimeString("en-IN")}`, 14, 58);
      
      // Divider line
      doc.setDrawColor(226, 232, 240); // border color (slate-200)
      doc.line(14, 62, 196, 62);
      
      // Table headers and rows
      const tableHeaders = [["Date", "Type", "Merchant / Source", "Category", "Amount (INR)", "Notes / Description"]];
      const tableRows = processedTransactions.map(t => [
        t.date,
        t.type === "income" ? "Income" : "Expense",
        t.merchant ? t.merchant.replace(/₹/g, "Rs.") : "—",
        t.category,
        `INR ${t.amount.toLocaleString()}`,
        t.note ? t.note.replace(/₹/g, "Rs.") : "—"
      ]);
      
      // Render transactions table
      autoTable(doc, {
        startY: 66,
        head: tableHeaders,
        body: tableRows,
        theme: "striped",
        headStyles: { 
          fillColor: [79, 70, 229], // indigo-600
          textColor: [255, 255, 255],
          fontStyle: "bold"
        },
        styles: { 
          fontSize: 9, 
          cellPadding: 3,
          textColor: [51, 65, 85]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // slate-50
        },
        margin: { left: 14, right: 14 }
      });
      
      // Category Summary Section
      let currentY = (doc as any).lastAutoTable.finalY + 15;
      
      // Ensure it fits, otherwise add a new page
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text("Category Spending & Budget Limits Analysis", 14, currentY);
      currentY += 6;
      
      const summaryHeaders = [["Category", "Total Spent (INR)", "Budget Limit (INR)", "Status"]];
      
      const categories = ["Food", "Shopping", "Transport", "Entertainment", "Utilities", "Other"];
      const summaryRows = categories.map(cat => {
        // Spent in category (expenses only)
        const spent = processedTransactions
          .filter(t => t.type === "expense" && t.category.toLowerCase() === cat.toLowerCase())
          .reduce((sum, t) => sum + t.amount, 0);
          
        const budget = budgets.find(b => b.category.toLowerCase() === cat.toLowerCase());
        const limit = budget ? budget.limit : null;
        
        const limitStr = limit ? `INR ${limit.toLocaleString()}` : "No Limit";
        const spentStr = `INR ${spent.toLocaleString()}`;
        
        let status = "—";
        if (limit) {
          if (spent > limit) {
            status = "Overspent";
          } else if (spent >= limit * 0.9) {
            status = "Warning (90%+)";
          } else {
            status = "Within Budget";
          }
        }
        
        return [cat, spentStr, limitStr, status];
      });
      
      autoTable(doc, {
        startY: currentY,
        head: summaryHeaders,
        body: summaryRows,
        theme: "grid",
        headStyles: { 
          fillColor: [99, 102, 241], // indigo-500
          textColor: [255, 255, 255]
        },
        styles: { 
          fontSize: 9,
          cellPadding: 3,
          textColor: [51, 65, 85]
        },
        margin: { left: 14, right: 14 }
      });
      
      // Financial Summary Totals Section
      let totalsY = (doc as any).lastAutoTable.finalY + 15;
      
      // Ensure it fits, otherwise add a new page
      if (totalsY > 240) {
        doc.addPage();
        totalsY = 20;
      }
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text("Statement Financial Summary Indicators", 14, totalsY);
      totalsY += 6;
      
      const totalIncome = processedTransactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
        
      const totalExpense = processedTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
        
      const endingBalance = totalIncome - totalExpense;
      
      const totalsHeaders = [["Summary Indicator", "Amount (INR)"]];
      const totalsRows = [
        ["Total Income", `INR ${totalIncome.toLocaleString()}`],
        ["Total Spend / Expense", `INR ${totalExpense.toLocaleString()}`],
        ["Ending Net Balance", `INR ${endingBalance.toLocaleString()}`]
      ];
      
      autoTable(doc, {
        startY: totalsY,
        head: totalsHeaders,
        body: totalsRows,
        theme: "grid",
        headStyles: { 
          fillColor: [30, 41, 59], // dark slate-800
          textColor: [255, 255, 255]
        },
        styles: { 
          fontSize: 9,
          cellPadding: 3,
          textColor: [51, 65, 85]
        },
        columnStyles: {
          0: { fontStyle: "bold" },
          1: { fontStyle: "bold" }
        },
        didParseCell: (data) => {
          if (data.row.index === 2 && data.column.index === 1) {
            // Color code positive balance green, negative red
            data.cell.styles.textColor = endingBalance >= 0 ? [22, 163, 74] : [220, 38, 38];
          }
        },
        margin: { left: 14, right: 14 }
      });
      
      // Footer page numbering and brand watermark
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Footer line
        doc.setDrawColor(241, 245, 249);
        doc.line(14, 280, 196, 280);
        
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate-400
        
        // Footer branding watermark
        const footerText = "Made with PocketSaathi";
        doc.text(footerText, 14, 286);
        
        const pageText = `Page ${i} of ${pageCount}`;
        doc.text(pageText, 196 - doc.getTextWidth(pageText), 286);
      }
      
      doc.save(`pocketsaathi_statement_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert("Error generating PDF. Please try again.");
    }
  };

  // Manual transaction submit
  const handleAddTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || !txMerchant) return;
    
    addTransaction({
      type: txType,
      category: txCategory,
      amount: parseFloat(txAmount),
      merchant: txMerchant,
      date: txDate,
      note: txNote,
      tags: txNote ? [txCategory.toLowerCase()] : [],
    });

    setTxAmount("");
    setTxMerchant("");
    setTxNote("");
    setShowAddTxModal(false);
  };

  // Manual Goal submit
  const handleAddGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName || !goalTarget) return;

    const todayStr = new Date().toISOString().split("T")[0];
    if (!goalDeadline) {
      alert("Please select a target deadline date.");
      return;
    }
    if (goalDeadline < todayStr) {
      alert("The deadline must be today or a future date. Past dates are not allowed.");
      return;
    }

    addGoal({
      name: goalName,
      targetAmount: parseFloat(goalTarget),
      currentAmount: 0,
      deadline: goalDeadline,
      category: goalCategory,
    });

    setGoalName("");
    setGoalTarget("");
    setGoalDeadline("");
    setShowAddGoalModal(false);
  };

  // Manual budget submit
  const handleAddBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetLimit) return;

    addBudget({
      category: budgetCategory,
      limit: parseFloat(budgetLimit),
      period: "monthly",
    });

    setBudgetLimit("");
    setShowAddBudgetModal(false);
  };

  // Add recurring bill / EMI submit
  const handleAddBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billName || !billAmount || !billDueDate) return;

    addSubscription({
      name: billName,
      amount: parseFloat(billAmount),
      frequency: billFrequency,
      nextBillingDate: billDueDate,
      category: billType,
      status: "active",
    });

    setBillName("");
    setBillAmount("");
    setBillDueDate(new Date().toISOString().split("T")[0]);
    setShowAddBillModal(false);
  };

  // Mark a bill/EMI as paid, logging a ledger transaction and rolling date forward
  const handleMarkBillAsPaid = (sub: any) => {
    // Check if already paid for the current month
    const today = new Date();
    const dueDate = new Date(sub.nextBillingDate);
    
    if (!isNaN(dueDate.getTime())) {
      const todayYear = today.getFullYear();
      const todayMonth = today.getMonth(); // 0-11
      const dueYear = dueDate.getFullYear();
      const dueMonth = dueDate.getMonth(); // 0-11
      
      // If the due date is in the future relative to today's month, it means they already paid it
      if (dueYear > todayYear || (dueYear === todayYear && dueMonth > todayMonth)) {
        alert(`Payment Blocked: You have already paid "${sub.name}" for this month. The next due date is ${sub.nextBillingDate}.`);
        return;
      }
    }

    // 1. Add ledger transaction
    addTransaction({
      type: "expense",
      category: sub.category === "EMI" ? "Investments" : "Utilities",
      amount: sub.amount,
      merchant: sub.name,
      date: new Date().toISOString().split("T")[0],
      note: `Auto-logged payment for ${sub.name}`,
    });

    // 2. Roll date forward
    const nextDate = new Date(sub.nextBillingDate);
    if (!isNaN(nextDate.getTime())) {
      if (sub.frequency === "yearly") {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      const nextDateStr = nextDate.toISOString().split("T")[0];
      updateSubscription(sub.id, {
        nextBillingDate: nextDateStr,
      });
      alert(`Paid! Successfully logged a ₹${sub.amount.toLocaleString()} expense for "${sub.name}", and updated next due date to ${nextDateStr}.`);
    } else {
      alert(`Paid! Successfully logged a ₹${sub.amount.toLocaleString()} expense for "${sub.name}".`);
    }
  };





  // Bulk transactions selection helpers
  const toggleSelectTx = (id: string) => {
    setSelectedTxIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    bulkDeleteTransactions(selectedTxIds);
    setSelectedTxIds([]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#030303] text-white flex flex-col items-center justify-center p-4 relative font-sans overflow-x-hidden">
        {/* Glow */}
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-blue-500 flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20 animate-pulse" />
          <h2 className="text-sm font-bold text-muted-foreground tracking-wider animate-pulse uppercase">Initializing PocketSaathi...</h2>
        </div>
      </div>
    );
  }

  if (showLanding) {
    return (
      <div className="min-h-screen w-full bg-[#030303] text-white flex flex-col justify-between overflow-x-hidden relative font-sans">
        {/* Glowing Background Gradients */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Navbar */}
        <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 relative">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-white font-black text-sm tracking-wider">PS</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">PocketSaathi</h1>
              <p className="text-[10px] text-muted-foreground font-medium">Understand. Save. Grow.</p>
            </div>
          </div>
          <button
            onClick={() => { setShowLanding(false); setShowOnboarding(true); }}
            className="px-5 py-2 text-xs font-semibold bg-white text-black hover:bg-white/95 hover:scale-105 active:scale-98 transition-all duration-200 rounded-xl shadow-lg cursor-pointer"
          >
            Launch Dashboard
          </button>
        </header>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto py-16 z-10 relative space-y-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider rounded-full">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Next-Gen AI Financial Twin
          </span>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight select-none">
            Meet <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent drop-shadow-sm">PocketSaathi</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            PocketSaathi is not an expense tracker. It is an <strong className="text-foreground">AI-Powered Financial Operating System</strong> that models your digital Twin, tracks category budgets, and helps you grow your wealth.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full pt-4">
            <button
              onClick={() => { setShowLanding(false); setShowOnboarding(true); }}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 hover:opacity-95 text-white text-sm font-bold rounded-2xl shadow-xl shadow-purple-500/15 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Enter Operating System</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Features Preview Section */}
        <div className="w-full max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 z-10 relative">
          <div className="p-6 rounded-2xl border border-border/40 bg-card/25 backdrop-blur-md space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-xl">🤖</div>
            <h3 className="font-bold text-sm text-foreground">AI Financial Twin</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A digital copy of your habits. Simulate scenarios like bike purchases to calculate affordability.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-border/40 bg-card/25 backdrop-blur-md space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl">💬</div>
            <h3 className="font-bold text-sm text-foreground">AI CFO Coach</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Chat naturally to search transaction entries, evaluate health scores, and get budget recommendations.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-border/40 bg-card/25 backdrop-blur-md space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl">⚡</div>
            <h3 className="font-bold text-sm text-foreground">OCR Receipt Scanner</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Drop invoice receipts to auto-extract items, merchants, category tags, and total tax values.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-border/40 bg-card/25 backdrop-blur-md space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xl">🔥</div>
            <h3 className="font-bold text-sm text-foreground">Gamified Streaks</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Maintain budget discipline to protect your streak count and unlock premium financial badges.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full text-center py-8 text-[11px] text-muted-foreground border-t border-border/20 z-10 relative">
          <p>© 2026 PocketSaathi. Understand. Save. Grow. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen w-full bg-[#030303] text-white flex flex-col items-center justify-center p-4 relative font-sans overflow-x-hidden">
        {/* Glow */}
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        <GlassCard hoverEffect={false} className="w-full max-w-lg border border-border shadow-2xl p-8 z-10 relative space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-blue-500 flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20">
              <span className="text-white font-black text-base">PS</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground mt-3">Configure Your Financial Twin</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Before we initialize PocketSaathi, let's configure your base cash flow parameters.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const salaryVal = parseFloat(salaryInput);
              if (isNaN(salaryVal) || salaryVal <= 0) {
                alert("Please enter a valid salary amount.");
                return;
              }
              setInitialSetup(salaryVal, autoBudgets, false, firstNameInput, lastNameInput);
              setShowOnboarding(false);
            }}
            className="space-y-6"
          >
            {/* Name Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raj"
                  value={firstNameInput}
                  onChange={(e) => setFirstNameInput(e.target.value)}
                  className="w-full text-xs font-semibold px-4 py-3 bg-secondary/35 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Padvekar"
                  value={lastNameInput}
                  onChange={(e) => setLastNameInput(e.target.value)}
                  className="w-full text-xs font-semibold px-4 py-3 bg-secondary/35 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Salary Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                Monthly In-Hand Salary / Income (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-sm text-muted-foreground">₹</span>
                <input
                  type="number"
                  required
                  placeholder="e.g. 75000"
                  value={salaryInput}
                  onChange={(e) => setSalaryInput(e.target.value)}
                  className="w-full text-sm font-bold pl-8 pr-4 py-3 bg-secondary/35 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Your monthly salary will be entered automatically as an income ledger entry for this month.
              </p>
            </div>

            {/* Auto Budget Option */}
            <div className="flex items-start gap-3 p-4 bg-muted/15 border border-border/40 rounded-xl transition-all duration-200">
              <input
                type="checkbox"
                id="autoBudgets"
                checked={autoBudgets}
                onChange={(e) => setAutoBudgets(e.target.checked)}
                className="mt-0.5 rounded accent-purple-500"
              />
              <div className="space-y-0.5 select-none cursor-pointer" onClick={() => setAutoBudgets(!autoBudgets)}>
                <label htmlFor="autoBudgets" className="text-xs font-bold text-foreground block">
                  Auto-configure budget limits (Recommended)
                </label>
                <span className="text-[10px] text-muted-foreground block leading-normal">
                  Automatically set monthly caps for Food (15%), Shopping (15%), Rent (25%), Utilities (10%) based on your salary.
                </span>
              </div>
            </div>

            {/* Launch & Skip Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/10 hover:opacity-95 transition-all cursor-pointer text-xs uppercase tracking-wider"
              >
                Initialize PocketSaathi
              </button>
              <button
                type="button"
                onClick={() => {
                  setInitialSetup(0, false, false);
                  setShowOnboarding(false);
                }}
                className="w-full py-2.5 bg-secondary hover:bg-secondary/80 border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-200 rounded-xl cursor-pointer text-center"
              >
                Skip for now, configure later
              </button>
            </div>
          </form>
        </GlassCard>
      </div>
    );
  }

  return (
    <>
      <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {/* -------------------- TAB: DASHBOARD -------------------- */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {!isDbConnected && userProfile?.id !== "sandbox-user" && (
            <GlassCard hoverEffect={false} className="border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3 animate-fade-in text-destructive font-semibold text-xs">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 animate-pulse" />
              <div>
                Database unreachable. Operating in local offline sandbox mode. Transactions will not be synced until connection is restored.
              </div>
            </GlassCard>
          )}

          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Financial Twin Dashboard</h2>
              <p className="text-sm text-muted-foreground">
                Proactive intelligence for your wealth. Welcome back, Raj.
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddTxModal(true)}
                className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground hover:scale-102 transition-all duration-200 rounded-xl flex items-center gap-1.5 shadow-md shadow-primary/10"
              >
                <Plus className="w-4 h-4" /> Add Ledger
              </button>
              <button
                onClick={() => setShowOcrModal(true)}
                className="px-4 py-2 text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground transition-all duration-200 rounded-xl flex items-center gap-1.5 border border-border"
              >
                <Sparkles className="w-4 h-4 text-ai" /> Scan Receipt
              </button>
            </div>
          </div>

          {/* Salary setup banner placeholder if user skipped setup */}
          {totalIncome === 0 && (
            <GlassCard hoverEffect={false} className="border-warning/30 bg-warning/5 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold uppercase text-warning tracking-wider">Base Salary Not Configured</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                    You skipped setting up your monthly income. Configure it now to calibrate your budget utilization caps, saving rates, and cash-flow projections correctly.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  openPrompt({
                    title: "Configure Monthly Income",
                    description: "Enter your Monthly In-Hand Salary / Income (₹) to calibrate your budgets and twin metrics:",
                    defaultValue: "75000",
                    inputType: "number",
                    onConfirm: (sal) => {
                      const salaryVal = parseFloat(sal);
                      if (!isNaN(salaryVal) && salaryVal > 0) {
                        setInitialSetup(salaryVal, true, false);
                        alert("Salary configured successfully! Recommended budgets generated.");
                      } else {
                        alert("Please enter a valid positive number.");
                      }
                    }
                  });
                }}
                className="px-4 py-2 text-xs font-bold bg-warning hover:bg-warning/90 text-black rounded-xl transition-all cursor-pointer shadow-md shadow-warning/10 shrink-0 self-stretch sm:self-center text-center font-bold"
              >
                Configure Income Now
              </button>
            </GlassCard>
          )}

          {/* Cards: Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard hoverEffect={false} className="relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground">Net Savings Rate</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center ${
                  savingsRate >= 30 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                }`}>
                  {savingsRate >= 30 ? <TrendingUp className="w-3 h-3 mr-1" /> : null}
                  {savingsRate.toFixed(0)}%
                </span>
              </div>
              <p className="text-2xl font-bold mt-2">₹{netSavings.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-1">₹{totalIncome.toLocaleString()} Income / mo</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-success via-info to-transparent" />
            </GlassCard>

            <GlassCard hoverEffect={false} className="relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground">Monthly Outflow</span>
                <span className="text-[10px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-full font-bold">
                  {((totalExpense / (totalIncome || 1)) * 100).toFixed(0)}% limit
                </span>
              </div>
              <p className="text-2xl font-bold mt-2 text-destructive">₹{totalExpense.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Active debit transactions</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive to-transparent" />
            </GlassCard>

            <GlassCard hoverEffect={false} className="relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground">Goals Savings</span>
                <span className="text-[10px] text-twin bg-twin/10 px-2 py-0.5 rounded-full font-bold">
                  Target Fund
                </span>
              </div>
              <p className="text-2xl font-bold mt-2">₹{goals.reduce((sum, g) => sum + g.currentAmount, 0).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{goals.length} Active Goals</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-twin via-ai to-transparent" />
            </GlassCard>

            <GlassCard hoverEffect={false} className="relative overflow-hidden bg-gradient-to-br from-ai/10 via-background to-card border-ai/20">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-ai flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Financial Twin
                </span>
                <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full font-bold">
                  {financialTwin.personality}
                </span>
              </div>
              <p className="text-sm font-semibold mt-3 text-foreground line-clamp-2 leading-relaxed">
                "{financialTwin.insights[0]}"
              </p>
              <button
                onClick={() => setActiveTab("twin")}
                className="text-[10px] font-bold text-ai hover:underline mt-2 flex items-center gap-0.5"
              >
                Inspect Twin advice <ChevronRight className="w-3 h-3" />
              </button>
            </GlassCard>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard hoverEffect={false} className="lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Income vs Expense Trends</h3>
                  <p className="text-xs text-muted-foreground">Historical balance compare</p>
                </div>
              </div>
              <DynamicChart
                type="bar"
                data={monthlyTrendsData}
                dataKeys={["income", "expense"]}
                colors={["#10b981", "#ef4444"]}
                height={260}
              />
            </GlassCard>

            <GlassCard hoverEffect={false}>
              <div className="mb-6">
                <h3 className="text-sm font-bold text-foreground">Spending breakdown</h3>
                <p className="text-xs text-muted-foreground">Category totals this month</p>
              </div>
              {spendingChartData.length > 0 ? (
                <DynamicChart
                  type="pie"
                  data={spendingChartData}
                  dataKeys={["value"]}
                  colors={spendingColors}
                  height={260}
                />
              ) : (
                <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">
                  No expense records logged.
                </div>
              )}
            </GlassCard>
          </div>

          {/* Quick Sandbox Tools */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent activity & Budgets status */}
            <GlassCard hoverEffect={false} className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Budget utilization</h3>
                <button onClick={() => setActiveTab("budgets")} className="text-[10px] font-bold text-primary hover:underline">
                  Manage budgets
                </button>
              </div>
              <div className="space-y-4">
                {budgets.slice(0, 3).map((b) => {
                  const spent = transactions
                    .filter((t) => t.category === b.category && t.type === "expense" && isCurrentMonth(t.date))
                    .reduce((sum, t) => sum + t.amount, 0);
                  const pct = Math.min(100, (spent / b.limit) * 100);
                  const isOver = spent > b.limit;
                  return (
                    <div key={b.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5">
                          {b.category}
                          {isOver && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                        </span>
                        <span className="text-muted-foreground">
                          ₹{spent.toLocaleString()} / <span className="text-foreground">₹{b.limit.toLocaleString()}</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOver ? "bg-destructive" : pct > 80 ? "bg-warning" : "bg-success"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Upcoming Bills & EMIs Widget */}
            <GlassCard hoverEffect={false} className="flex flex-col h-full min-h-[220px]">
              <div className="flex justify-between items-center pb-2 border-b border-border mb-3">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5 text-primary animate-pulse" /> Upcoming Bills & EMIs
                </span>
                <button onClick={() => setActiveTab("bills")} className="text-[10px] font-bold text-primary hover:underline">
                  All Bills
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 text-xs pr-1 max-h-[140px]">
                {upcomingBills.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-8">
                    No bills or EMIs due in the next 7 days.
                  </p>
                ) : (
                  upcomingBills.map((sub) => {
                    const isEMI = sub.category === "EMI";
                    const isUtility = sub.category === "Utility Bill";
                    const typeLabel = isEMI ? "EMI" : isUtility ? "Bill" : "Sub";
                    
                    let badgeColor = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
                    if (isEMI) badgeColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                    if (isUtility) badgeColor = "text-sky-400 bg-sky-500/10 border-sky-500/20";

                    return (
                      <div key={sub.id} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/25 border border-border/40 hover:bg-secondary/40 transition-all">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground truncate">{sub.name}</span>
                            <span className={`text-[8px] px-1 py-0.2 rounded border font-semibold scale-90 ${badgeColor}`}>
                              {typeLabel}
                            </span>
                          </div>
                          <span className="text-[9px] text-muted-foreground block mt-0.5">Due: {sub.nextBillingDate} • ₹{sub.amount.toLocaleString()}</span>
                        </div>

                        <button
                          onClick={() => handleMarkBillAsPaid(sub)}
                          className="p-1 text-success hover:bg-success/10 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center border border-success/20 shadow-sm"
                          title="Mark as Paid & Log to Ledger"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </GlassCard>

            {/* AI Assistant Chat Snippet */}
            <GlassCard hoverEffect={false} className="flex flex-col h-full min-h-[220px]">
              <div className="flex justify-between items-center pb-2 border-b border-border mb-3">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-ai animate-pulse" /> Ask AI CFO Coach
                </span>
                <button onClick={() => setActiveTab("coach")} className="text-[10px] font-bold text-ai hover:underline">
                  Full Assistant
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 text-xs pr-1 max-h-[140px]">
                <div className="bg-ai/10 border border-ai/10 p-2.5 rounded-xl text-foreground">
                  <strong>AI Twin:</strong> Your food spending rose 18% this week. Let me know if you want me to recommend a budget adjustment.
                </div>
                <div className="bg-secondary p-2.5 rounded-xl text-muted-foreground flex items-center gap-2 cursor-pointer hover:bg-secondary/80 hover:text-foreground transition-all"
                     onClick={() => {
                       setActiveTab("coach");
                       setChatInput("Can I afford a laptop for ₹65000?");
                     }}>
                  <HelpCircle className="w-3.5 h-3.5 text-ai shrink-0" />
                  <span>Try: "Can I afford a laptop for ₹65000?"</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* -------------------- TAB: TRANSACTIONS -------------------- */}
      {activeTab === "transactions" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Transactions Ledger</h2>
              <p className="text-sm text-muted-foreground">
                Manual and AI smart transaction parser inputs
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowAddTxModal(true)}
                className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" /> Add Transaction
              </button>
              <button
                onClick={() => setShowOcrModal(true)}
                className="px-4 py-2 text-xs font-bold bg-secondary border border-border text-foreground hover:bg-secondary/80 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-ai" /> OCR Receipt
              </button>
              <button
                onClick={() => setShowVoiceModal(true)}
                className="px-4 py-2 text-xs font-bold bg-secondary border border-border text-foreground hover:bg-secondary/80 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Mic className="w-4 h-4 text-ai animate-pulse-slow" />
                <span>Voice Entry</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 text-xs bg-secondary border border-border rounded-xl text-foreground hover:bg-secondary/80 flex items-center gap-1 cursor-pointer"
                title="Export Ledger to CSV"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="px-3 py-2 text-xs bg-secondary border border-border rounded-xl text-foreground hover:bg-secondary/80 flex items-center gap-1 cursor-pointer"
                title="Export Ledger to PDF"
              >
                <Download className="w-4 h-4 text-primary" /> Export PDF
              </button>
            </div>
          </div>

          {/* Search, filters and actions */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-muted/10 p-3.5 rounded-xl border border-border/50">
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search merchant or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Category filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-xs px-3 py-2 bg-background border border-border rounded-xl focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Shopping">Shopping</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Utilities">Utilities</option>
                <option value="Housing">Housing</option>
                <option value="Investments">Investments</option>
                <option value="Salary">Salary</option>
              </select>

              {/* Type filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="text-xs px-3 py-2 bg-background border border-border rounded-xl focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="income">Income (+)</option>
                <option value="expense">Expense (-)</option>
              </select>

              {/* Timeframe filter */}
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="text-xs px-3 py-2 bg-background border border-border rounded-xl focus:outline-none"
              >
                <option value="all">All Time</option>
                <option value="monthly">This Month</option>
                <option value="quarterly">Last 3 Months</option>
                <option value="half-yearly">Last 6 Months</option>
                <option value="yearly">This Year</option>
              </select>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs px-3 py-2 bg-background border border-border rounded-xl focus:outline-none"
              >
                <option value="date-desc">Recent First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Amount: High to Low</option>
                <option value="amount-asc">Amount: Low to High</option>
              </select>
            </div>

            {selectedTxIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="w-full md:w-auto px-4 py-2 text-xs font-bold bg-destructive text-white rounded-xl flex items-center justify-center gap-1.5 hover:bg-destructive/95"
              >
                <Trash2 className="w-4 h-4" /> Delete Selected ({selectedTxIds.length})
              </button>
            )}
          </div>

          {/* Transactions List */}
          <GlassCard hoverEffect={false} className="p-0 overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={
                          processedTransactions.length > 0 &&
                          processedTransactions.every((t) => selectedTxIds.includes(t.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newSelections = new Set([...selectedTxIds, ...processedTransactions.map((t) => t.id)]);
                            setSelectedTxIds(Array.from(newSelections));
                          } else {
                            const filteredSelections = selectedTxIds.filter(
                              (id) => !processedTransactions.some((pt) => pt.id === id)
                            );
                            setSelectedTxIds(filteredSelections);
                          }
                        }}
                        className="rounded accent-primary"
                      />
                    </th>
                    <th className="p-4">Merchant / Flow</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Note / Tag</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {processedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground font-medium">
                        No transactions found matching the selected timeframe or criteria.
                      </td>
                    </tr>
                  ) : (
                    processedTransactions.map((t) => {
                      const isSelected = selectedTxIds.includes(t.id);
                      return (
                        <tr
                          key={t.id}
                          className={`hover:bg-muted/10 transition-colors ${
                            isSelected ? "bg-primary/5" : ""
                          }`}
                        >
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectTx(t.id)}
                              className="rounded accent-primary"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold ${
                                  t.type === "income"
                                    ? "bg-success/10 text-success"
                                    : "bg-secondary text-foreground"
                                }`}
                              >
                                {t.type === "income" ? "+" : "-"}
                              </span>
                              <div>
                                <span className="font-semibold text-foreground block">
                                  {t.merchant}
                                </span>
                                {t.recurring && (
                                  <span className="text-[9px] text-muted-foreground font-medium uppercase border border-border px-1.5 py-0.2 rounded-full">
                                    Subscription
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-lg bg-secondary text-secondary-foreground font-semibold">
                              {t.category}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {new Date(t.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          <td className="p-4">
                            <div className="max-w-[200px] space-y-0.5">
                              {t.note && <p className="truncate text-muted-foreground">{t.note}</p>}
                              {t.tags && t.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {t.tags.map((tg) => (
                                    <span key={tg} className="text-[9px] px-1 rounded-md bg-info/10 text-info">
                                      #{tg}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className={`p-4 text-right font-bold ${
                            t.type === "income" ? "text-success" : "text-foreground"
                          }`}>
                            {t.type === "income" ? "+" : "-"}₹{t.amount.toLocaleString()}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => deleteTransaction(t.id)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* -------------------- TAB: BUDGETS -------------------- */}
      {activeTab === "budgets" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Active Budgets</h2>
              <p className="text-sm text-muted-foreground">
                Set and control category limits with smart warnings
              </p>
            </div>
            
            <button
              onClick={() => setShowAddBudgetModal(true)}
              className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground hover:scale-102 transition-all rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Budget Limit
            </button>
          </div>

          {/* AI Recommended Budgets alert */}
          <GlassCard hoverEffect={false} className="border-ai/30 bg-ai/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-ai shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h3 className="text-xs uppercase font-bold text-ai">AI Insights: Recommended Budgets</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mitra AI analyzed your historical spending patterns and recommended 10% lower limits to save ₹6,500 monthly.
                </p>
              </div>
            </div>
            
            <button
              onClick={() => {
                const recs = getAIBudgetRecommendations(transactions);
                recs.forEach((r) => addBudget(r));
                alert("Applied AI budget recommendations successfully!");
              }}
              className="px-3.5 py-1.5 text-xs font-bold bg-ai text-white rounded-lg hover:bg-ai/90 shadow-md shadow-ai/15"
            >
              Auto-Apply All Recommendations
            </button>
          </GlassCard>

          {/* Budget Grid list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets.map((b) => {
              const spent = transactions
                .filter((t) => t.category === b.category && t.type === "expense" && isCurrentMonth(t.date))
                .reduce((sum, t) => sum + t.amount, 0);
              const percent = Math.min(100, (spent / b.limit) * 100);
              const overspent = spent > b.limit;
              const remaining = b.limit - spent;

              return (
                <GlassCard key={b.id} hoverEffect={true} className="flex flex-col justify-between space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-semibold">
                        {b.category}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">Monthly cycle</p>
                    </div>
                    {overspent ? (
                      <span className="text-[10px] font-bold text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5" /> OVER BUDGET
                      </span>
                    ) : percent > 80 ? (
                      <span className="text-[10px] font-bold text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-full">
                        WARNING: {percent.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
                        SAFE TRACK
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Utilized: {percent.toFixed(0)}%</span>
                      <span className="font-bold text-foreground">
                        ₹{spent.toLocaleString()} / ₹{b.limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          overspent ? "bg-destructive" : percent > 80 ? "bg-warning" : "bg-success"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex justify-between items-center text-[11px] text-muted-foreground">
                    <span>
                      {overspent
                        ? `Over by ₹${Math.abs(remaining).toLocaleString()}`
                        : `₹${remaining.toLocaleString()} left to spend`}
                    </span>
                    <button
                      onClick={() => {
                        openPrompt({
                          title: `Adjust ${b.category} Limit`,
                          description: `Enter the new monthly budget limit for ${b.category} (₹):`,
                          defaultValue: b.limit.toString(),
                          inputType: "number",
                          onConfirm: (newLim) => {
                            const limitVal = parseFloat(newLim);
                            if (!isNaN(limitVal) && limitVal >= 0) {
                              updateBudget(b.id, limitVal);
                            } else {
                              alert("Please enter a valid positive number.");
                            }
                          }
                        });
                      }}
                      className="text-[10px] text-primary font-bold hover:underline"
                    >
                      Adjust Limit
                    </button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------- TAB: SAVINGS GOALS -------------------- */}
      {activeTab === "goals" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Active Savings Goals</h2>
              <p className="text-sm text-muted-foreground">
                Plan, track targets, and run automated SIP projections
              </p>
            </div>
            
            <button
              onClick={() => setShowAddGoalModal(true)}
              className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground hover:scale-102 transition-all rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create Savings Goal
            </button>
          </div>

          {/* Goal List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map((g) => {
              const completion = (g.currentAmount / g.targetAmount) * 100;
              const remaining = g.targetAmount - g.currentAmount;
              
              return (
                <GlassCard key={g.id} hoverEffect={false} className="space-y-4 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-foreground text-sm">{g.name}</h3>
                      <p className="text-xs text-muted-foreground">Deadline: {g.deadline}</p>
                    </div>
                    <span className="text-xs font-bold text-twin bg-twin/10 px-2 py-0.5 rounded-full border border-twin/20">
                      {g.category}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Completed: {completion.toFixed(0)}%</span>
                      <span className="font-bold text-foreground">
                        ₹{g.currentAmount.toLocaleString()} / ₹{g.targetAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-ai to-twin rounded-full transition-all duration-500"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedGoalId(g.id);
                        openPrompt({
                          title: `Contribute to ${g.name}`,
                          description: `Enter amount to contribute to "${g.name}" goal (₹):`,
                          defaultValue: "5000",
                          inputType: "number",
                          onConfirm: (amt) => {
                            const amtVal = parseFloat(amt);
                            if (!isNaN(amtVal) && amtVal > 0) {
                              contributeToGoal(g.id, amtVal);
                            } else {
                              alert("Please enter a valid positive number.");
                            }
                          }
                        });
                      }}
                      className="flex-1 py-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-bold"
                    >
                      Contribute Funds
                    </button>
                    <button
                      onClick={() => deleteGoal(g.id)}
                      className="px-3 py-2 border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg text-xs"
                    >
                      Remove
                    </button>
                  </div>
                  
                  {/* Subtle AI planner helper */}
                  <div className="text-[10px] text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/40">
                    💡 <strong>Smart Plan:</strong> Set aside ₹{Math.round(remaining / 6).toLocaleString()}/mo for the next 6 months to secure this target before the deadline.
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------- TAB: FINANCIAL TWIN -------------------- */}
      {activeTab === "twin" && (
        <div className="space-y-6">
          <div className="pb-2 border-b border-border">
            <h2 className="text-2xl font-bold tracking-tight">AI Financial Twin</h2>
            <p className="text-sm text-muted-foreground">
              A digital reflection of your monetary habits, risk models, and goals.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Twin Avatar & Profile Panel */}
            <GlassCard hoverEffect={false} className="lg:col-span-1 space-y-6 flex flex-col justify-between">
              <div className="space-y-4 text-center">
                {/* Twin holographic avatar avatar */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-ai via-twin to-info mx-auto relative flex items-center justify-center p-1.5 shadow-xl shadow-ai/10">
                  <div className="w-full h-full bg-card rounded-full flex flex-col items-center justify-center overflow-hidden">
                    <span className="text-3xl animate-bounce">🤖</span>
                  </div>
                  <span className="absolute bottom-1 right-1 w-4 h-4 bg-success border-2 border-card rounded-full animate-ping" />
                  <span className="absolute bottom-1 right-1 w-4 h-4 bg-success border-2 border-card rounded-full" />
                </div>
                
                <div>
                  <h3 className="font-bold text-base text-foreground">{financialTwin.name}</h3>
                  <p className="text-xs text-muted-foreground font-medium">Synchronized 2m ago</p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Personality Model
                  </span>
                  <div className="flex justify-center gap-1.5">
                    {["Saver", "Investor", "Balanced Planner", "Impulse Buyer"].map((p) => {
                      const isSel = financialTwin.personality === p;
                      return (
                        <button
                          key={p}
                          onClick={() => updateTwinPersonality(p as any)}
                          className={`text-[9px] px-2 py-1 rounded-lg border font-semibold ${
                            isSel
                              ? "bg-twin text-white border-twin"
                              : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-xs text-muted-foreground font-bold">
                    <span>Twin Learning Progress</span>
                    <span>{financialTwin.learningProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-ai to-twin rounded-full"
                      style={{ width: `${financialTwin.learningProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 bg-muted/10 p-4 rounded-xl border border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Configuration Matrix
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Risk Model: <span className="font-bold text-foreground capitalize">{financialTwin.riskTolerance}</span></div>
                  <div>Sync State: <span className="font-bold text-success">Active</span></div>
                </div>
              </div>
            </GlassCard>

            {/* AI Twin Insights & What-If Sandbox */}
            <div className="lg:col-span-2 space-y-6">
              {/* Insights */}
              <GlassCard hoverEffect={false} className="space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-twin" /> Proactive Twin Recommendations
                </h3>
                <div className="space-y-2.5">
                  {financialTwin.insights.map((ins, index) => (
                    <div
                      key={index}
                      className="p-3 bg-muted/20 border-l-2 border-twin rounded-r-xl text-xs leading-relaxed text-foreground flex items-start gap-2.5"
                    >
                      <span className="text-twin font-bold">●</span>
                      <span>{ins}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>


            </div>
          </div>

          {/* Monthly Audit Report Card */}
          <GlassCard hoverEffect={false} className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-border">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-twin" /> AI Monthly Twin Report & Financial Score
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  CIBIL-style dynamic financial audit rating and expense feedback for last month.
                </p>
              </div>
              <button
                onClick={handleGenerateReport}
                disabled={loadingReport}
                className="px-4 py-2 text-xs font-bold bg-twin text-white disabled:opacity-50 transition-all rounded-xl cursor-pointer hover:scale-[1.02] shadow-md shadow-twin/10"
              >
                {loadingReport ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating...
                  </span>
                ) : (
                  "Generate Last Month's Report"
                )}
              </button>
            </div>

            {monthlyReport ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* Score Dial */}
                <div className="md:col-span-1 flex flex-col items-center justify-center border border-border bg-muted/5 rounded-2xl p-6 text-center space-y-4">
                  <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                    Last Month's Twin Score
                  </p>
                  <div className="relative flex items-center justify-center w-36 h-36">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="62"
                        className="text-secondary stroke-current"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r="62"
                        className={`stroke-current ${
                          monthlyReport.rating === "Excellent"
                            ? "text-success"
                            : monthlyReport.rating === "Good"
                            ? "text-info"
                            : monthlyReport.rating === "Fair"
                            ? "text-warning"
                            : "text-destructive"
                        }`}
                        strokeWidth="8"
                        strokeDasharray={390}
                        strokeDashoffset={390 - (390 * (monthlyReport.score - 300)) / 600}
                        fill="transparent"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-3xl font-extrabold text-foreground">{monthlyReport.score}</span>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold">out of 900</span>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${
                        monthlyReport.rating === "Excellent"
                          ? "bg-success/10 text-success border-success/20"
                          : monthlyReport.rating === "Good"
                          ? "bg-info/10 text-info border-info/20"
                          : monthlyReport.rating === "Fair"
                          ? "bg-warning/10 text-warning border-warning/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      }`}
                    >
                      Rating: {monthlyReport.rating}
                    </span>
                  </div>
                </div>

                {/* Audit breakdown text */}
                <div className="md:col-span-2 space-y-4">
                  <div className="space-y-1 bg-muted/5 p-3 rounded-xl border border-border/30">
                    <h4 className="text-[10px] uppercase font-bold text-muted-foreground">Twin Summary</h4>
                    <p className="text-xs leading-relaxed text-foreground">{monthlyReport.summary}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] uppercase font-bold text-destructive flex items-center gap-1">
                        ⚠️ Areas for Improvement
                      </h4>
                      <ul className="text-xs space-y-1.5 pl-4 list-disc text-muted-foreground">
                        {monthlyReport.improvements.map((imp: string, idx: number) => (
                          <li key={idx}><span className="text-foreground">{imp}</span></li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-[10px] uppercase font-bold text-success flex items-center gap-1">
                        🎯 Tips for Next Month
                      </h4>
                      <ul className="text-xs space-y-1.5 pl-4 list-disc text-muted-foreground">
                        {monthlyReport.nextMonthTips.map((tip: string, idx: number) => (
                          <li key={idx}><span className="text-foreground">{tip}</span></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-border/60 bg-muted/5 rounded-2xl">
                <p className="text-xs text-muted-foreground mb-4 max-w-[280px] mx-auto leading-relaxed">
                  No monthly report generated yet. Click analyze to trigger the AI Twin scoring engine for your previous month's transaction logs.
                </p>
                <button
                  onClick={handleGenerateReport}
                  disabled={loadingReport}
                  className="px-4 py-2 text-xs font-bold bg-twin text-white rounded-xl hover:scale-102 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 mx-auto shadow-md shadow-twin/10"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Analyze Last Month's Activity
                </button>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* -------------------- TAB: COACH (CHAT) -------------------- */}
      {activeTab === "coach" && (
        <div className="space-y-6 h-[calc(100vh-120px)] md:h-[calc(100vh-64px)] flex flex-col justify-between">
          <div className="pb-2 border-b border-border">
            <h2 className="text-2xl font-bold tracking-tight">AI Financial Coach</h2>
            <p className="text-sm text-muted-foreground">
              Natural language companion analyzing your transactions and budget logs
            </p>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-xl bg-muted/5 border border-border/40 min-h-[300px]">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 max-w-[80%] ${
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${
                  msg.sender === "user" ? "bg-primary text-primary-foreground font-bold" : "bg-ai text-white"
                }`}>
                  {msg.sender === "user" ? "U" : "🤖"}
                </div>
                
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-card border border-border rounded-tl-none text-foreground"
                }`}>
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Preset Prompts Sandbox */}
          <div className="flex flex-wrap gap-2 text-[10px]">
            {[
              "Get Statement",
              "Graphical Representation",
              "How much did I spend on food?",
              "Show expenses above ₹2000.",
              "Am I financially healthy?",
              "Can I afford a laptop for ₹65000?",
            ].map((p) => (
              <button
                key={p}
                onClick={() => handlePresetClick(p)}
                className="px-2.5 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form id="chat-form" onSubmit={handleChatSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Ask your coach anything... (e.g. Can I buy a gaming console for ₹45000?)"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 text-xs px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
            />
            <button
              type="submit"
              className="px-5 bg-ai hover:bg-ai/90 text-white rounded-xl flex items-center justify-center shadow-lg shadow-ai/15 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}





      {/* -------------------- TAB: STREAKS & BADGES -------------------- */}
      {activeTab === "achievements" && (
        <div className="space-y-6">
          <div className="pb-2 border-b border-border">
            <h2 className="text-2xl font-bold tracking-tight">Gamified Saving Streaks</h2>
            <p className="text-sm text-muted-foreground">
              Unlock rewards by maintaining discipline with budget parameters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Streaks Widget */}
            <GlassCard hoverEffect={false} className="text-center space-y-4 flex flex-col justify-center py-8">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Savings Streak</span>
              
              <div className="relative inline-flex items-center justify-center mx-auto">
                {/* Glowing ring */}
                <div className="w-20 h-20 rounded-full border-4 border-warning/20 flex items-center justify-center text-4xl shadow-lg shadow-warning/10">
                  🔥
                </div>
              </div>

              <div>
                <p className="text-3xl font-extrabold text-foreground">{streaks.current} Days</p>
                <p className="text-xs text-muted-foreground mt-0.5">Current under-budget streak</p>
              </div>

              <div className="h-px bg-border w-2/3 mx-auto" />
              
              <p className="text-xs text-muted-foreground">
                Longest streak record: <span className="font-bold text-foreground">{streaks.highest} days</span>
              </p>
            </GlassCard>

            {/* Achievements/Badges List */}
            <GlassCard hoverEffect={false} className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Unlocked Achievements</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {achievements.map((ac) => (
                  <div
                    key={ac.id}
                    className={`p-4 rounded-xl border flex gap-3 items-start ${
                      ac.unlocked
                        ? "border-success/20 bg-success/5"
                        : "border-border/60 bg-muted/5 opacity-55"
                    }`}
                  >
                    <span className="text-2xl">{ac.icon}</span>
                    <div className="space-y-0.5">
                      <span className="font-bold text-xs text-foreground block">{ac.title}</span>
                      <span className="text-[11px] text-muted-foreground block">{ac.description}</span>
                      {ac.unlocked && ac.unlockedAt && (
                        <span className="text-[9px] text-success font-semibold uppercase mt-1 block">
                          Unlocked {ac.unlockedAt}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* -------------------- TAB: BILLS & EMIS -------------------- */}
      {activeTab === "bills" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Bills & Recurring EMIs</h2>
              <p className="text-sm text-muted-foreground">
                Track and manage active loan payments, recurring utilities, and subscription outlays
              </p>
            </div>
            
            <button
              onClick={() => setShowAddBillModal(true)}
              className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground hover:scale-102 transition-all rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Add Bill/EMI
            </button>
          </div>

          {/* Aggregates Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard hoverEffect={false} className="relative overflow-hidden p-6 space-y-2">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <CreditCard className="w-12 h-12 text-primary" />
              </div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Monthly Loan EMIs</span>
              <h3 className="text-2xl font-extrabold text-foreground">
                ₹{subscriptions
                  .filter(s => s.category === "EMI" && s.status === "active")
                  .reduce((sum, s) => sum + s.amount * (s.frequency === "yearly" ? 1 / 12 : 1), 0)
                  .toLocaleString()}
              </h3>
              <p className="text-[10px] text-muted-foreground">Active loan liabilities & installments</p>
            </GlassCard>

            <GlassCard hoverEffect={false} className="relative overflow-hidden p-6 space-y-2">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <CalendarDays className="w-12 h-12 text-secondary-foreground" />
              </div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Monthly Subscriptions</span>
              <h3 className="text-2xl font-extrabold text-foreground">
                ₹{subscriptions
                  .filter(s => s.category === "Subscription" && s.status === "active")
                  .reduce((sum, s) => sum + s.amount * (s.frequency === "yearly" ? 1 / 12 : 1), 0)
                  .toLocaleString()}
              </h3>
              <p className="text-[10px] text-muted-foreground">Service, media & utility plans</p>
            </GlassCard>

            <GlassCard hoverEffect={false} className="relative overflow-hidden p-6 space-y-2 bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <TrendingUp className="w-12 h-12 text-primary" />
              </div>
              <span className="text-[10px] uppercase font-bold text-primary tracking-wider block">Total Monthly Commitments</span>
              <h3 className="text-2xl font-black text-foreground">
                ₹{subscriptions
                  .filter(s => s.status === "active")
                  .reduce((sum, s) => sum + s.amount * (s.frequency === "yearly" ? 1 / 12 : 1), 0)
                  .toLocaleString()}
              </h3>
              <p className="text-[10px] text-muted-foreground">Combined recurring outflow</p>
            </GlassCard>
          </div>

          {/* List and Grid */}
          <GlassCard hoverEffect={false} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Active Recurring Liabilities</h3>
              <span className="text-xs text-muted-foreground">
                {subscriptions.length} recurring items configured
              </span>
            </div>

            {subscriptions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs italic">
                No active recurring bills, subscriptions, or EMIs found. Use the "Add Bill/EMI" button to log your first liability.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground">
                      <th className="py-3 px-2 font-bold uppercase tracking-wider text-[10px]">Name</th>
                      <th className="py-3 px-2 font-bold uppercase tracking-wider text-[10px]">Type</th>
                      <th className="py-3 px-2 font-bold uppercase tracking-wider text-[10px]">Amount</th>
                      <th className="py-3 px-2 font-bold uppercase tracking-wider text-[10px]">Billing Schedule</th>
                      <th className="py-3 px-2 font-bold uppercase tracking-wider text-[10px]">Next Due Date</th>
                      <th className="py-3 px-2 font-bold uppercase tracking-wider text-[10px]">Status</th>
                      <th className="py-3 px-2 text-right font-bold uppercase tracking-wider text-[10px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s) => {
                      const isEMI = s.category === "EMI";
                      const isUtility = s.category === "Utility Bill";
                      const typeLabel = isEMI ? "Loan EMI" : isUtility ? "Utility Bill" : "Subscription";
                      
                      let typeBadgeColor = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
                      if (isEMI) typeBadgeColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                      if (isUtility) typeBadgeColor = "text-sky-400 bg-sky-500/10 border-sky-500/20";

                      return (
                        <tr key={s.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                          <td className="py-3 px-2 font-bold text-foreground">{s.name}</td>
                          <td className="py-3 px-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${typeBadgeColor}`}>
                              {typeLabel}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-extrabold text-foreground">
                            ₹{s.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-muted-foreground capitalize">{s.frequency}</td>
                          <td className="py-3 px-2 text-muted-foreground font-medium">{s.nextBillingDate}</td>
                          <td className="py-3 px-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              s.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                            }`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button
                              onClick={() => handleMarkBillAsPaid(s)}
                              className="p-1.5 rounded-lg hover:bg-success/10 text-muted-foreground hover:text-success transition-all cursor-pointer inline-flex items-center justify-center mr-1"
                              title="Mark as Paid & Log Expense"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteSubscription(s.id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all cursor-pointer inline-flex items-center justify-center"
                              title="Cancel or Remove Liability"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </DashboardLayout>

    {/* -------------------- MODAL: ADD TRANSACTION -------------------- */}
    {showAddTxModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm animate-fade-in">
        <GlassCard hoverEffect={false} className="w-full max-w-md border border-border shadow-2xl p-6 relative">
          <h3 className="text-sm font-bold text-foreground mb-4">Add Ledger Transaction</h3>
          
          <form onSubmit={handleAddTxSubmit} className="space-y-4">
            {/* Type toggle */}
            <div className="flex gap-2 p-1 bg-secondary rounded-xl">
              <button
                type="button"
                onClick={() => setTxType("expense")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  txType === "expense"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Expense Out
              </button>
              <button
                type="button"
                onClick={() => setTxType("income")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  txType === "income"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Income In
              </button>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Merchant Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Swiggy, Amazon, Salary"
                value={txMerchant}
                onChange={(e) => setTxMerchant(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="₹ 1200"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Category</label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none text-foreground"
                >
                  <option value="Food" className="bg-card text-foreground">Food</option>
                  <option value="Transport" className="bg-card text-foreground">Transport</option>
                  <option value="Shopping" className="bg-card text-foreground">Shopping</option>
                  <option value="Entertainment" className="bg-card text-foreground">Entertainment</option>
                  <option value="Utilities" className="bg-card text-foreground">Utilities</option>
                  <option value="Housing" className="bg-card text-foreground">Housing</option>
                  <option value="Investments" className="bg-card text-foreground">Investments</option>
                  <option value="Salary" className="bg-card text-foreground">Salary</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Date</label>
              <input
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none text-foreground"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Note (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Dinner with friends"
                value={txNote}
                onChange={(e) => setTxNote(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl"
              >
                Confirm Entry
              </button>
              <button
                type="button"
                onClick={() => setShowAddTxModal(false)}
                className="px-4 py-2 text-xs bg-secondary text-foreground rounded-xl"
              >
                Cancel
              </button>
            </div>
          </form>
        </GlassCard>
      </div>
    )}

    {/* -------------------- MODAL: OCR SCANNER -------------------- */}
    {showOcrModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm animate-fade-in">
        <GlassCard hoverEffect={false} className="w-full max-w-md border border-border shadow-2xl p-6 relative">
          <h3 className="text-sm font-bold text-foreground mb-4">OCR Receipt Scanner</h3>
          <ReceiptScanner onSuccess={handleOcrSuccess} />
          <button
            onClick={() => setShowOcrModal(false)}
            className="w-full mt-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs rounded-xl font-medium"
          >
            Close Scanner
          </button>
        </GlassCard>
      </div>
    )}

    {/* -------------------- MODAL: VOICE ENTRY -------------------- */}
    {showVoiceModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm animate-fade-in">
        <GlassCard hoverEffect={false} className="w-full max-w-md border border-border shadow-2xl p-6 relative">
          <h3 className="text-sm font-bold text-foreground mb-4">Voice Expense Logging</h3>
          <VoiceWidget onSuccess={handleVoiceSuccess} />
          <button
            onClick={() => setShowVoiceModal(false)}
            className="w-full mt-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs rounded-xl font-medium"
          >
            Cancel
          </button>
        </GlassCard>
      </div>
    )}

    {/* -------------------- MODAL: ADD GOAL -------------------- */}
    {showAddGoalModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm animate-fade-in">
        <GlassCard hoverEffect={false} className="w-full max-w-md border border-border shadow-2xl p-6 relative">
          <h3 className="text-sm font-bold text-foreground mb-4">Create Savings Goal</h3>
          
          <form onSubmit={handleAddGoalSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Goal Name</label>
              <input
                type="text"
                required
                placeholder="e.g. New Car, Emergency Reserves"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Target Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="₹ 150000"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Category type</label>
                <select
                  value={goalCategory}
                  onChange={(e) => setGoalCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  <option value="Emergency Fund" className="bg-card text-foreground">Emergency Fund</option>
                  <option value="Vacation" className="bg-card text-foreground">Vacation</option>
                  <option value="Vehicle" className="bg-card text-foreground">Vehicle</option>
                  <option value="Education" className="bg-card text-foreground">Education</option>
                  <option value="House" className="bg-card text-foreground">House</option>
                  <option value="Custom" className="bg-card text-foreground">Custom Fund</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Target Deadline</label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                required
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl"
              >
                Initialize Goal
              </button>
              <button
                type="button"
                onClick={() => setShowAddGoalModal(false)}
                className="px-4 py-2 text-xs bg-secondary text-foreground rounded-xl"
              >
                Cancel
              </button>
            </div>
          </form>
        </GlassCard>
      </div>
    )}

    {/* -------------------- MODAL: ADD BUDGET -------------------- */}
    {showAddBudgetModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm animate-fade-in">
        <GlassCard hoverEffect={false} className="w-full max-w-md border border-border shadow-2xl p-6 relative">
          <h3 className="text-sm font-bold text-foreground mb-4">Add Category Budget Limit</h3>
          
          <form onSubmit={handleAddBudgetSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Target Category</label>
              <select
                value={budgetCategory}
                onChange={(e) => setBudgetCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              >
                <option value="Food" className="bg-card text-foreground">Food</option>
                <option value="Transport" className="bg-card text-foreground">Transport</option>
                <option value="Shopping" className="bg-card text-foreground">Shopping</option>
                <option value="Entertainment" className="bg-card text-foreground">Entertainment</option>
                <option value="Utilities" className="bg-card text-foreground">Utilities</option>
                <option value="Housing" className="bg-card text-foreground">Housing</option>
                <option value="Investments" className="bg-card text-foreground">Investments</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Monthly Spending Cap (₹)</label>
              <input
                type="number"
                required
                placeholder="e.g. 15000"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl"
              >
                Apply Limit
              </button>
              <button
                type="button"
                onClick={() => setShowAddBudgetModal(false)}
                className="px-4 py-2 text-xs bg-secondary text-foreground rounded-xl"
              >
                Cancel
              </button>
            </div>
          </form>
        </GlassCard>
      </div>
    )}
    
    {/* -------------------- MODAL: ADD BILL/EMI -------------------- */}
    {showAddBillModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm animate-fade-in">
        <GlassCard hoverEffect={false} className="w-full max-w-md border border-border shadow-2xl p-6 relative text-foreground">
          <h3 className="text-sm font-bold text-foreground mb-4">Add Recurring Bill or EMI</h3>
          
          <form onSubmit={handleAddBillSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Liability Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Car Loan EMI, Netflix, Rent"
                value={billName}
                onChange={(e) => setBillName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 15000"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Bill Type</label>
                <select
                  value={billType}
                  onChange={(e) => setBillType(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  <option value="Subscription" className="bg-card text-foreground">Subscription</option>
                  <option value="EMI" className="bg-card text-foreground">Loan EMI</option>
                  <option value="Utility Bill" className="bg-card text-foreground">Utility Bill</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Frequency</label>
                <select
                  value={billFrequency}
                  onChange={(e) => setBillFrequency(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  <option value="monthly" className="bg-card text-foreground">Monthly</option>
                  <option value="yearly" className="bg-card text-foreground">Yearly</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={billDueDate}
                  onChange={(e) => setBillDueDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl cursor-pointer"
              >
                Save Liability
              </button>
              <button
                type="button"
                onClick={() => setShowAddBillModal(false)}
                className="px-4 py-2 text-xs bg-secondary text-foreground rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </GlassCard>
      </div>
    )}

    {/* -------------------- MODAL: CUSTOM PROMPT -------------------- */}
    {customPrompt.isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm animate-fade-in">
        <GlassCard hoverEffect={false} className="w-full max-w-sm border border-border shadow-2xl p-6 relative">
          <h3 className="text-sm font-bold text-foreground mb-1.5">{customPrompt.title}</h3>
          {customPrompt.description && (
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{customPrompt.description}</p>
          )}
          
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              customPrompt.onConfirm(promptValue);
              closePrompt();
            }}
            className="space-y-4"
          >
            <div>
              <input
                type={customPrompt.inputType}
                autoFocus
                required
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-secondary/35 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground font-semibold"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold transition-all shadow-md shadow-primary/10 cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={closePrompt}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs rounded-xl font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </GlassCard>
      </div>
    )}
  </>
  );
}
