"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  ArrowUpDown,
  PieChart,
  Target,
  Trophy,
  TrendingUp,
  Brain,
  Sparkles,
  Sun,
  Moon,
  Shield,
  ChevronRight,
  Users,
  LogOut,
  CalendarDays,
} from "lucide-react";
import { useFinance } from "../context/finance-context";
import { UserButton, useUser, SignOutButton } from "@clerk/nextjs";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface DashboardLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  activeTab,
  setActiveTab,
  children,
}) => {
  const { theme, toggleTheme, healthScore, financialTwin } = useFinance();
  const { user, isLoaded } = useUser();

  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Transactions", icon: ArrowUpDown },
    { id: "budgets", label: "Budgets", icon: PieChart },
    { id: "goals", label: "Savings Goals", icon: Target },
    { id: "bills", label: "Bills & EMIs", icon: CalendarDays },
    { id: "twin", label: "Financial Twin", icon: Brain },
    { id: "coach", label: "AI Coach", icon: Sparkles },
    { id: "achievements", label: "Streaks & Badges", icon: Trophy },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* SIDEBAR - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/60 backdrop-blur-md shrink-0 select-none">
        {/* Brand Logo */}
        <div className="p-6 flex items-center gap-3 border-b border-border/60">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-ai via-twin to-info flex items-center justify-center shadow-lg shadow-ai/20">
            <span className="text-white font-black text-sm tracking-wider">PS</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              PocketSaathi
            </h1>
            <p className="text-[10px] text-muted-foreground font-medium">Understand. Save. Grow.</p>
          </div>
        </div>

        {/* Financial Health Widget */}
        <div className="mx-4 my-4 p-4 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/40 flex items-center gap-3">
          <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-10 h-10 transform -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                className="stroke-muted fill-none"
                strokeWidth="3"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                className="stroke-success fill-none transition-all duration-1000 ease-out"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - healthScore / 100)}`}
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-success">{healthScore}</span>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block leading-none">Health Score</span>
            <span className="text-xs font-semibold text-foreground mt-0.5 block truncate">
              {healthScore >= 75 ? "Excellent Health" : healthScore >= 60 ? "Stable Finances" : "Needs Review"}
            </span>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-inherit" : "text-muted-foreground"}`} />
                {item.label}
                {item.id === "twin" && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-twin animate-pulse" />
                )}
                {item.id === "coach" && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-ai/10 text-ai border border-ai/20 font-bold uppercase tracking-wider">
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Panel (User Profile + Settings) */}
        <div className="p-4 border-t border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {isLoaded && user ? (
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8 rounded-full shadow-md"
                  }
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
                RP
              </div>
            )}
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate leading-snug">
                {isLoaded && user 
                  ? (user.fullName || user.username || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "Raj Padvekar") 
                  : "Raj Padvekar"}
              </span>
              <span className="text-[9px] text-muted-foreground block truncate">{financialTwin.personality}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary-foreground/10 text-muted-foreground hover:text-foreground transition-all duration-200"
              title="Toggle Light/Dark Theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <SignOutButton>
              <button
                className="p-2 rounded-lg bg-secondary hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all duration-200"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </SignOutButton>
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAV - Mobile-first layout */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border flex items-center justify-around py-2 px-1 pb-safe-bottom">
        {navItems.slice(0, 6).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl transition-all duration-200 ${
                isActive ? "text-primary font-bold scale-105" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 tracking-tight font-semibold">{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0">
        {/* Desktop Top Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-border bg-card/25 backdrop-blur-md shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">PocketSaathi Workspace</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-bold text-foreground capitalize">
              {activeTab === "twin"
                ? "AI Financial Twin"
                : activeTab === "coach"
                ? "AI CFO Coach"
                : activeTab === "achievements"
                ? "Streaks & Badges"
                : activeTab === "bills"
                ? "Bills & EMIs"
                : activeTab}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Live Financial Health Score */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-success/5 border border-success/15 rounded-xl text-xs font-semibold text-success shadow-sm shadow-success/5">
              <Shield className="w-3.5 h-3.5 animate-pulse" />
              <span>Financial Health: {healthScore}</span>
            </div>

            {/* Prominent Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border/80 text-xs font-semibold text-foreground rounded-xl transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98]"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-warning" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-ai via-twin to-info flex items-center justify-center">
              <span className="text-white font-black text-xs">PS</span>
            </div>
            <h2 className="text-xs font-bold tracking-tight">PocketSaathi</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-bold bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded-full">
              <Shield className="w-3 h-3" /> {healthScore}
            </span>
            {isLoaded && user && (
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-6 h-6 rounded-full shadow-sm"
                  }
                }}
              />
            )}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <SignOutButton>
              <button
                className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-destructive"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </SignOutButton>
          </div>
        </header>

        {/* Main scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 select-text">
          {children}
        </div>
      </main>
    </div>
  );
};
