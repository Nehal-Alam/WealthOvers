"use client";

import * as React from "react";
import {
  format,
  isToday,
  isYesterday,
  isSameMonth,
  addMonths,
  subMonths,
} from "date-fns";
import {
  Search,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  ArrowLeftRight,
  Utensils,
  ShoppingCart,
  Car,
  Home,
  ShoppingBag,
  Zap,
  Coins,
  Briefcase,
  Tag,
  HeartPulse,
  Plane,
  X,
  CreditCard,
  Landmark,
  RotateCcw,
} from "lucide-react";
import { Tables } from "@/types/database";
import { cn } from "@/lib/utils";
import Decimal from "decimal.js";
import { toDecimal } from "@/lib/calculations/financial";
import { useUIStore } from "@/stores/ui-store";
import { AccountSelector } from "@/components/accounts/account-selector";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface MobileActivityViewProps {
  transactions: any[];
  accounts: Tables<"accounts">[];
  categories: (Tables<"categories"> & { subcategories?: Tables<"subcategories">[] })[];
  onEdit: (tx: any) => void;
  onInspect: (tx: any) => void;
}

function getCategoryIcon(name: string) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("food") || lower.includes("dining") || lower.includes("restaurant") || lower.includes("cafe")) {
    return <Utensils className="h-4 w-4" />;
  }
  if (lower.includes("grocer") || lower.includes("supermarket") || lower.includes("provision")) {
    return <ShoppingCart className="h-4 w-4" />;
  }
  if (lower.includes("transport") || lower.includes("fuel") || lower.includes("cab") || lower.includes("commute") || lower.includes("uber") || lower.includes("ola")) {
    return <Car className="h-4 w-4" />;
  }
  if (lower.includes("rent") || lower.includes("housing") || lower.includes("home")) {
    return <Home className="h-4 w-4" />;
  }
  if (lower.includes("shop") || lower.includes("clothing") || lower.includes("shoes") || lower.includes("electronics")) {
    return <ShoppingBag className="h-4 w-4" />;
  }
  if (lower.includes("bill") || lower.includes("utility") || lower.includes("electric") || lower.includes("recharge")) {
    return <Zap className="h-4 w-4" />;
  }
  if (lower.includes("sip") || lower.includes("invest") || lower.includes("mutual") || lower.includes("stock") || lower.includes("shares")) {
    return <Coins className="h-4 w-4" />;
  }
  if (lower.includes("salary") || lower.includes("wage") || lower.includes("payroll") || lower.includes("business") || lower.includes("operating")) {
    return <Briefcase className="h-4 w-4" />;
  }
  if (lower.includes("health") || lower.includes("medical") || lower.includes("pharma")) {
    return <HeartPulse className="h-4 w-4" />;
  }
  if (lower.includes("travel") || lower.includes("flight") || lower.includes("hotel")) {
    return <Plane className="h-4 w-4" />;
  }
  return <Tag className="h-4 w-4" />;
}

export function MobileActivityView({
  transactions,
  accounts,
  categories,
  onEdit,
  onInspect,
}: MobileActivityViewProps) {
  const { selectedAccountId, setSelectedAccountId } = useUIStore();
  const [selectedMonth, setSelectedMonth] = React.useState<Date>(() => new Date());
  const [filterType, setFilterType] = React.useState<"all" | "spent" | "income">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  // Month navigation helpers
  const handlePrevMonth = () => setSelectedMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setSelectedMonth((prev) => addMonths(prev, 1));

  // Selected Account
  const selectedAccount = React.useMemo(() => {
    if (selectedAccountId === "all") return null;
    return accounts.find((a) => a.id === selectedAccountId) || null;
  }, [selectedAccountId, accounts]);

  // Filter transactions by selected account first
  const accountTransactions = React.useMemo(() => {
    if (!selectedAccount) return transactions;
    return transactions.filter(
      (t) => t.account_id === selectedAccount.id || t.destination_account_id === selectedAccount.id
    );
  }, [transactions, selectedAccount]);

  // Filter transactions by selected month, search query and type filter
  const { monthTransactions, spentThisMonth, groupedDays } = React.useMemo(() => {
    let spentSum = new Decimal(0);
    const inMonth: any[] = [];

    for (const t of accountTransactions) {
      const txDate = new Date(t.transaction_date);
      if (isSameMonth(txDate, selectedMonth)) {
        inMonth.push(t);
        if (selectedAccount) {
          if (t.transaction_type === "expense" && t.account_id === selectedAccount.id) {
            spentSum = spentSum.plus(toDecimal(t.amount || 0));
          } else if (
            t.transaction_type === "transfer" &&
            t.account_id === selectedAccount.id &&
            t.destination_account_id !== selectedAccount.id
          ) {
            spentSum = spentSum.plus(toDecimal(t.amount || 0));
          }
        } else {
          if (t.transaction_type === "expense") {
            spentSum = spentSum.plus(toDecimal(t.amount || 0));
          }
        }
      }
    }

    // Filter by type
    let filtered = inMonth;
    if (filterType === "spent") {
      filtered = filtered.filter((t) => {
        if (selectedAccount && t.transaction_type === "transfer") {
          return t.account_id === selectedAccount.id; // transfer out
        }
        return t.transaction_type === "expense";
      });
    } else if (filterType === "income") {
      filtered = filtered.filter((t) => {
        if (selectedAccount && t.transaction_type === "transfer") {
          return t.destination_account_id === selectedAccount.id; // transfer in
        }
        return t.transaction_type === "income" || t.transaction_type === "refund";
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => {
        const desc = (t.description || "").toLowerCase();
        const merchant = (t.merchant_or_person || "").toLowerCase();
        const cat = (t.category?.name || "").toLowerCase();
        return desc.includes(q) || merchant.includes(q) || cat.includes(q);
      });
    }

    // Group filtered transactions by date (yyyy-MM-dd)
    const groups = new Map<string, { date: Date; items: any[]; totalSpent: Decimal }>();

    for (const t of filtered) {
      const key = format(new Date(t.transaction_date), "yyyy-MM-dd");
      if (!groups.has(key)) {
        groups.set(key, {
          date: new Date(t.transaction_date),
          items: [],
          totalSpent: new Decimal(0),
        });
      }
      const g = groups.get(key)!;
      g.items.push(t);
      if (t.transaction_type === "expense") {
        g.totalSpent = g.totalSpent.plus(toDecimal(t.amount || 0));
      }
    }

    // Sort days descending
    const sortedGroups = Array.from(groups.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );

    return {
      monthTransactions: inMonth,
      spentThisMonth: spentSum.toNumber(),
      groupedDays: sortedGroups,
    };
  }, [accountTransactions, selectedMonth, filterType, searchQuery, selectedAccount]);

  // Format date header string
  const formatDayHeader = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "d MMMM yyyy");
  };

  return (
    <div className="flex flex-col space-y-4 max-w-md mx-auto pb-24 text-mobile-primary select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER: ACTIVITY TITLE, THEME TOGGLE & ACTIONS
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 px-1">
        <h1 className="text-xl font-bold tracking-tight text-mobile-primary font-mono">
          Activity
        </h1>

        <div className="flex items-center space-x-1.5">
          {/* Theme Toggle */}
          <div className="h-9 w-9 rounded-full bg-mobile-surface border border-mobile-border flex items-center justify-center text-mobile-secondaryText hover:text-mobile-primary transition-all">
            <ThemeToggle />
          </div>

          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="h-9 w-9 rounded-full bg-mobile-surface border border-mobile-border flex items-center justify-center text-mobile-secondaryText hover:text-mobile-primary active:scale-95 transition-all cursor-pointer"
            aria-label="Search transactions"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            onClick={() => setSelectedMonth(new Date())}
            className="h-9 w-9 rounded-full bg-mobile-surface border border-mobile-border flex items-center justify-center text-mobile-secondaryText hover:text-mobile-primary active:scale-95 transition-all cursor-pointer"
            title="Reset to current month"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. COMPACT ACCOUNT SELECTOR (Home & Activity Synced)
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <AccountSelector accounts={accounts} />

        {selectedAccountId !== "all" && (
          <button
            onClick={() => setSelectedAccountId("all")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-mobile-secondary text-mobile-accent text-[11px] font-mono border border-mobile-border hover:bg-mobile-secondary/80 transition-all cursor-pointer"
            title="Reset to All Accounts"
          >
            <RotateCcw className="h-3 w-3" />
            <span>All Accounts</span>
          </button>
        )}
      </div>

      {/* SEARCH BAR (collapsible) */}
      {isSearchOpen && (
        <div className="relative px-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-mobile-secondaryText" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search merchant, category, note..."
            className="w-full bg-mobile-surface border border-mobile-border rounded-2xl pl-10 pr-9 py-2 text-xs text-mobile-primary placeholder:text-mobile-secondaryText focus:outline-none focus:border-mobile-accent font-mono"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-mobile-secondaryText hover:text-mobile-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. MONTH NAVIGATION
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-2 py-1">
        <button
          onClick={handlePrevMonth}
          className="h-8 w-8 rounded-full bg-mobile-surface border border-mobile-border flex items-center justify-center text-mobile-secondaryText hover:text-mobile-primary active:scale-95 transition-colors cursor-pointer"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="text-sm font-semibold text-mobile-primary font-mono tracking-wide">
          {format(selectedMonth, "MMMM yyyy")}
        </span>

        <button
          onClick={handleNextMonth}
          className="h-8 w-8 rounded-full bg-mobile-surface border border-mobile-border flex items-center justify-center text-mobile-secondaryText hover:text-mobile-primary active:scale-95 transition-colors cursor-pointer"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. SPENT THIS MONTH SUMMARY CARD
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-mobile-surface border border-mobile-border rounded-3xl p-5 shadow-xl space-y-2">
        <span className="text-[11px] text-mobile-secondaryText font-mono uppercase tracking-wider block">
          {selectedAccount ? `Spent (${selectedAccount.name})` : "Spent this month"}
        </span>
        <div className="text-3xl sm:text-4xl font-extrabold text-mobile-primary font-mono tabular-nums tracking-tight">
          ₹ {spentThisMonth.toLocaleString("en-IN")}
        </div>
        <div className="text-xs text-mobile-secondaryText font-mono flex items-center gap-1.5 pt-0.5">
          <span>{monthTransactions.length} entries</span>
          <span>•</span>
          <span>{selectedAccount ? selectedAccount.name : "All linked accounts"}</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. SEGMENTED FILTER PILLS (All | Spent | Income)
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-mobile-surface border border-mobile-border rounded-2xl text-xs font-mono">
        <button
          onClick={() => setFilterType("all")}
          className={cn(
            "py-2 text-center rounded-xl transition-all cursor-pointer font-medium",
            filterType === "all"
              ? "bg-mobile-secondary text-mobile-primary font-bold shadow-xs border border-mobile-border"
              : "text-mobile-secondaryText hover:text-mobile-primary"
          )}
        >
          All
        </button>
        <button
          onClick={() => setFilterType("spent")}
          className={cn(
            "py-2 text-center rounded-xl transition-all cursor-pointer font-medium",
            filterType === "spent"
              ? "bg-mobile-secondary text-mobile-expense font-bold shadow-xs border border-mobile-border"
              : "text-mobile-secondaryText hover:text-mobile-primary"
          )}
        >
          Spent
        </button>
        <button
          onClick={() => setFilterType("income")}
          className={cn(
            "py-2 text-center rounded-xl transition-all cursor-pointer font-medium",
            filterType === "income"
              ? "bg-mobile-secondary text-mobile-income font-bold shadow-xs border border-mobile-border"
              : "text-mobile-secondaryText hover:text-mobile-primary"
          )}
        >
          Income
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. TRANSACTIONS GROUPED BY DATE
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-1">
        {groupedDays.length === 0 ? (
          <div className="p-8 bg-mobile-surface border border-dashed border-mobile-border rounded-3xl text-center text-xs text-mobile-secondaryText font-mono">
            No transactions found for this period
            {selectedAccount ? ` on ${selectedAccount.name}` : ""}.
          </div>
        ) : (
          groupedDays.map((group) => {
            const dateStr = formatDayHeader(group.date);
            const totalSpentNum = group.totalSpent.toNumber();

            return (
              <div key={group.date.toISOString()} className="space-y-1.5">
                {/* Date Group Header */}
                <div className="flex items-center justify-between px-1 text-xs font-mono">
                  <span className="text-mobile-secondaryText font-medium">{dateStr}</span>
                  {totalSpentNum > 0 && (
                    <span className="text-mobile-secondaryText font-bold tabular-nums">
                      ₹{totalSpentNum.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                {/* Day's Transactions Card */}
                <div className="bg-mobile-surface border border-mobile-border rounded-3xl p-3 divide-y divide-mobile-border/60 shadow-md">
                  {group.items.map((tx) => {
                    const isIncome =
                      tx.transaction_type === "income" || tx.transaction_type === "refund";
                    const isTransfer = tx.transaction_type === "transfer";
                    const catName = tx.category?.name || "General";
                    const amountNum = parseFloat(tx.amount);
                    const timeStr = format(new Date(tx.transaction_date), "HH:mm");

                    return (
                      <div
                        key={tx.id}
                        onClick={() => onInspect(tx)}
                        className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-xs cursor-pointer active:bg-mobile-secondary/50 transition-colors rounded-xl px-1"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Circular Category Icon */}
                          <div
                            className={cn(
                              "h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 border border-mobile-border",
                              isIncome
                                ? "bg-mobile-income/15 text-mobile-income"
                                : isTransfer
                                ? "bg-mobile-accent/15 text-mobile-accent"
                                : "bg-mobile-secondary text-mobile-secondaryText"
                            )}
                          >
                            {getCategoryIcon(catName)}
                          </div>

                          {/* Merchant & Subtitle */}
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-mobile-primary truncate">
                              {tx.merchant_or_person || tx.description}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-mobile-secondaryText font-mono mt-0.5">
                              <span>{timeStr}</span>
                              <span>•</span>
                              <span className="truncate max-w-[120px]">{catName}</span>
                              {tx.account?.name && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[80px]">
                                    {tx.account.name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right shrink-0">
                          <span
                            className={cn(
                              "font-mono font-bold tabular-nums text-xs",
                              isIncome
                                ? "text-mobile-income"
                                : isTransfer
                                ? "text-mobile-accent"
                                : "text-mobile-primary"
                            )}
                          >
                            {isIncome ? "+" : isTransfer ? "" : "-"}
                            ₹{amountNum.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
