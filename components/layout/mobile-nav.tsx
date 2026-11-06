"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BarChart3,
  Landmark,
  Settings,
  Plus,
  TrendingDown,
  TrendingUp,
  ArrowLeftRight,
  CreditCard,
  Scale,
  Coins,
  HandCoins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileNav() {
  const pathname = usePathname();
  const { openQuickTransaction } = useUIStore();
  const [actionDrawerOpen, setActionDrawerOpen] = React.useState(false);

  const isHomeActive = pathname === "/dashboard";
  const isStatsActive = pathname.startsWith("/insights");
  const isAccountsActive = pathname.startsWith("/accounts");
  const isSettingsActive = pathname.startsWith("/settings");

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border bg-surface/95 backdrop-blur-md flex items-center justify-around px-2 pb-safe transition-colors shadow-lg"
      aria-label="Mobile navigation"
    >
      {/* 1. HOME TAB */}
      <Link
        href="/dashboard"
        prefetch={true}
        className={cn(
          "flex flex-col items-center justify-center min-h-[44px] min-w-[48px] py-1 gap-1 text-[11px] font-medium transition-colors rounded-lg",
          isHomeActive
            ? "text-terminalAccent font-bold"
            : "text-text-secondary hover:text-text-primary"
        )}
      >
        <Home
          className={cn(
            "h-5 w-5 transition-transform",
            isHomeActive && "scale-110 text-terminalAccent"
          )}
        />
        <span>Home</span>
        {isHomeActive && (
          <span className="h-0.5 w-5 rounded-full bg-terminalAccent -mt-0.5" />
        )}
      </Link>

      {/* 2. STATS TAB */}
      <Link
        href="/insights"
        prefetch={true}
        className={cn(
          "flex flex-col items-center justify-center min-h-[44px] min-w-[48px] py-1 gap-1 text-[11px] font-medium transition-colors rounded-lg",
          isStatsActive
            ? "text-terminalAccent font-bold"
            : "text-text-secondary hover:text-text-primary"
        )}
      >
        <BarChart3
          className={cn(
            "h-5 w-5 transition-transform",
            isStatsActive && "scale-110 text-terminalAccent"
          )}
        />
        <span>Stats</span>
        {isStatsActive && (
          <span className="h-0.5 w-5 rounded-full bg-terminalAccent -mt-0.5" />
        )}
      </Link>

      {/* CENTER SLOT: FLOATING CIRCULAR QUICK TRANSACTION BUTTON (+) */}
      <Sheet open={actionDrawerOpen} onOpenChange={setActionDrawerOpen}>
        <SheetTrigger asChild>
          <button
            className="relative -top-4 h-12 w-12 rounded-full bg-terminalAccent text-app-bg flex items-center justify-center shadow-lg shadow-terminalAccent/30 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-terminalAccent focus:ring-offset-2 cursor-pointer z-50 border-2 border-surface"
            aria-label="Quick transaction entry"
            title="Quick Add Transaction"
          >
            <Plus className="h-7 w-7 stroke-[2.5]" />
          </button>
        </SheetTrigger>

        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-4 bg-surface border-t border-border max-w-md mx-auto max-h-[85vh] overflow-y-auto"
        >
          <SheetHeader className="pb-3 text-left">
            <SheetTitle className="text-base font-bold text-text-primary font-mono tracking-tight flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-terminalAccent" />
              QUICK ADD TRANSACTION
            </SheetTitle>
            <p className="text-xs text-text-secondary">
              Select transaction category to log verified financial entries
            </p>
          </SheetHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2">
            {/* Expense */}
            <button
              onClick={() => {
                setActionDrawerOpen(false);
                openQuickTransaction("expense");
              }}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-surface-elevated/40 hover:bg-surface-elevated transition-colors text-left cursor-pointer min-h-[48px]"
            >
              <div className="h-10 w-10 rounded-xl bg-negative/15 text-negative flex items-center justify-center shrink-0">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-text-primary">Expense</p>
                <p className="text-[11px] text-text-secondary">Outflow, bills, dining</p>
              </div>
            </button>

            {/* Income */}
            <button
              onClick={() => {
                setActionDrawerOpen(false);
                openQuickTransaction("income");
              }}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-surface-elevated/40 hover:bg-surface-elevated transition-colors text-left cursor-pointer min-h-[48px]"
            >
              <div className="h-10 w-10 rounded-xl bg-positive/15 text-positive flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-text-primary">Income</p>
                <p className="text-[11px] text-text-secondary">Salary, bonus, refunds</p>
              </div>
            </button>

            {/* Transfer */}
            <button
              onClick={() => {
                setActionDrawerOpen(false);
                openQuickTransaction("transfer");
              }}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-surface-elevated/40 hover:bg-surface-elevated transition-colors text-left cursor-pointer min-h-[48px]"
            >
              <div className="h-10 w-10 rounded-xl bg-info/15 text-info flex items-center justify-center shrink-0">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-text-primary">Transfer</p>
                <p className="text-[11px] text-text-secondary">Move between accounts</p>
              </div>
            </button>

            {/* Credit Card Purchase */}
            <Link
              href="/credit-cards"
              onClick={() => setActionDrawerOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-surface-elevated/40 hover:bg-surface-elevated transition-colors text-left cursor-pointer min-h-[48px]"
            >
              <div className="h-10 w-10 rounded-xl bg-terminalAccent/15 text-terminalAccent flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-text-primary">Credit Card</p>
                <p className="text-[11px] text-text-secondary">Swipe or repayment</p>
              </div>
            </Link>

            {/* Loan EMI / Prepayment */}
            <Link
              href="/loans"
              onClick={() => setActionDrawerOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-surface-elevated/40 hover:bg-surface-elevated transition-colors text-left cursor-pointer min-h-[48px]"
            >
              <div className="h-10 w-10 rounded-xl bg-positive/15 text-positive flex items-center justify-center shrink-0">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-text-primary">Loan Payment</p>
                <p className="text-[11px] text-text-secondary">EMI or extra prepayment</p>
              </div>
            </Link>

            {/* Debt Settlement */}
            <Link
              href="/loans?tab=debts"
              onClick={() => setActionDrawerOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-surface-elevated/40 hover:bg-surface-elevated transition-colors text-left cursor-pointer min-h-[48px]"
            >
              <div className="h-10 w-10 rounded-xl bg-negative/15 text-negative flex items-center justify-center shrink-0">
                <HandCoins className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-text-primary">Debt Settlement</p>
                <p className="text-[11px] text-text-secondary">Friends & private loans</p>
              </div>
            </Link>

            {/* Investment Transaction */}
            <Link
              href="/investments"
              onClick={() => setActionDrawerOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-surface-elevated/40 hover:bg-surface-elevated transition-colors text-left cursor-pointer min-h-[48px] sm:col-span-2"
            >
              <div className="h-10 w-10 rounded-xl bg-terminalAccent/15 text-terminalAccent flex items-center justify-center shrink-0">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-text-primary">Investment</p>
                <p className="text-[11px] text-text-secondary">Stocks, Mutual Funds, SIP, Gold</p>
              </div>
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      {/* 3. ACCOUNTS TAB */}
      <Link
        href="/accounts"
        prefetch={true}
        className={cn(
          "flex flex-col items-center justify-center min-h-[44px] min-w-[48px] py-1 gap-1 text-[11px] font-medium transition-colors rounded-lg",
          isAccountsActive
            ? "text-terminalAccent font-bold"
            : "text-text-secondary hover:text-text-primary"
        )}
      >
        <Landmark
          className={cn(
            "h-5 w-5 transition-transform",
            isAccountsActive && "scale-110 text-terminalAccent"
          )}
        />
        <span>Accounts</span>
        {isAccountsActive && (
          <span className="h-0.5 w-5 rounded-full bg-terminalAccent -mt-0.5" />
        )}
      </Link>

      {/* 4. SETTINGS TAB */}
      <Link
        href="/settings"
        prefetch={true}
        className={cn(
          "flex flex-col items-center justify-center min-h-[44px] min-w-[48px] py-1 gap-1 text-[11px] font-medium transition-colors rounded-lg",
          isSettingsActive
            ? "text-terminalAccent font-bold"
            : "text-text-secondary hover:text-text-primary"
        )}
      >
        <Settings
          className={cn(
            "h-5 w-5 transition-transform",
            isSettingsActive && "scale-110 text-terminalAccent"
          )}
        />
        <span>Settings</span>
        {isSettingsActive && (
          <span className="h-0.5 w-5 rounded-full bg-terminalAccent -mt-0.5" />
        )}
      </Link>
    </nav>
  );
}
