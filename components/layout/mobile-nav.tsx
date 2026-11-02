"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Receipt,
  BarChart3,
  Target,
  Plus,
  TrendingDown,
  TrendingUp,
  ArrowLeftRight,
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
  const isActivityActive = pathname.startsWith("/transactions");
  const isInsightsActive = pathname.startsWith("/insights");
  const isPlanActive =
    pathname.startsWith("/budgets") ||
    pathname.startsWith("/goals") ||
    pathname.startsWith("/recurring");

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 border-t border-border bg-card/95 backdrop-blur-lg flex items-center justify-around px-3 pb-safe transition-colors shadow-lg"
      aria-label="Mobile navigation"
    >
      {/* Destination 1: Home */}
      <Link
        href="/dashboard"
        prefetch={true}
        className={cn(
          "flex flex-col items-center justify-center w-14 py-1 gap-0.5 text-[10px] font-medium transition-colors rounded-lg",
          isHomeActive
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Home
          className={cn(
            "h-5 w-5 transition-transform",
            isHomeActive && "scale-110 text-primary"
          )}
        />
        <span>Home</span>
        {isHomeActive && (
          <span className="h-0.5 w-4 rounded-full bg-primary mt-0.5" />
        )}
      </Link>

      {/* Destination 2: Activity (Transactions) */}
      <Link
        href="/transactions"
        prefetch={true}
        className={cn(
          "flex flex-col items-center justify-center w-14 py-1 gap-0.5 text-[10px] font-medium transition-colors rounded-lg",
          isActivityActive
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Receipt
          className={cn(
            "h-5 w-5 transition-transform",
            isActivityActive && "scale-110 text-primary"
          )}
        />
        <span>Activity</span>
        {isActivityActive && (
          <span className="h-0.5 w-4 rounded-full bg-primary mt-0.5" />
        )}
      </Link>

      {/* Center Slot: Elevated Floating Quick Action Button (FAB) */}
      <Sheet open={actionDrawerOpen} onOpenChange={setActionDrawerOpen}>
        <SheetTrigger asChild>
          <button
            className="relative -top-3 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/25 hover:bg-primary-hover active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
            aria-label="Add transaction"
            title="Add transaction"
          >
            <Plus className="h-6 w-6" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-4 bg-card border-t border-border max-w-md mx-auto"
        >
          <SheetHeader className="pb-3 text-left">
            <SheetTitle className="text-base font-bold text-foreground">
              Add Transaction
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Record a financial transaction or transfer funds across accounts
            </p>
          </SheetHeader>

          <div className="grid grid-cols-1 gap-2.5 py-2">
            <button
              onClick={() => {
                setActionDrawerOpen(false);
                openQuickTransaction("expense");
              }}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-surface-secondary/40 hover:bg-surface-secondary transition-colors text-left cursor-pointer"
            >
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">
                  Add Expense
                </p>
                <p className="text-xs text-muted-foreground">
                  Log an outflow, purchase, or bill payment
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setActionDrawerOpen(false);
                openQuickTransaction("income");
              }}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-surface-secondary/40 hover:bg-surface-secondary transition-colors text-left cursor-pointer"
            >
              <div className="h-10 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">
                  Add Income
                </p>
                <p className="text-xs text-muted-foreground">
                  Record salary, dividend, interest, or deposit
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setActionDrawerOpen(false);
                openQuickTransaction("transfer");
              }}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-surface-secondary/40 hover:bg-surface-secondary transition-colors text-left cursor-pointer"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">
                  Transfer Funds
                </p>
                <p className="text-xs text-muted-foreground">
                  Move money between your connected accounts
                </p>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Destination 3: Insights */}
      <Link
        href="/insights"
        prefetch={true}
        className={cn(
          "flex flex-col items-center justify-center w-14 py-1 gap-0.5 text-[10px] font-medium transition-colors rounded-lg",
          isInsightsActive
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <BarChart3
          className={cn(
            "h-5 w-5 transition-transform",
            isInsightsActive && "scale-110 text-primary"
          )}
        />
        <span>Insights</span>
        {isInsightsActive && (
          <span className="h-0.5 w-4 rounded-full bg-primary mt-0.5" />
        )}
      </Link>

      {/* Destination 4: Plan */}
      <Link
        href="/budgets"
        prefetch={true}
        className={cn(
          "flex flex-col items-center justify-center w-14 py-1 gap-0.5 text-[10px] font-medium transition-colors rounded-lg",
          isPlanActive
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Target
          className={cn(
            "h-5 w-5 transition-transform",
            isPlanActive && "scale-110 text-primary"
          )}
        />
        <span>Plan</span>
        {isPlanActive && (
          <span className="h-0.5 w-4 rounded-full bg-primary mt-0.5" />
        )}
      </Link>
    </nav>
  );
}
