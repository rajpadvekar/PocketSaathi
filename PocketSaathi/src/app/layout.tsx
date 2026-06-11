import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FinanceProvider } from "../context/finance-context";

import { ClerkProvider } from "@clerk/nextjs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PocketSaathi — Understand. Save. Grow. | AI-Powered Financial Operating System",
  description: "Manage transactions, customize budgets, analyze savings goals, query finances with AI Chat Coach, and simulate future outcomes with your AI Financial Twin.",
  keywords: ["pocketsaathi", "personal finance", "ai personal finance", "budget manager", "financial twin", "expense tracker"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      >
        <body className="min-h-full flex flex-col">
          <FinanceProvider>
            {children}
          </FinanceProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

