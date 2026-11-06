"use client";

import * as React from "react";
import {
  format,
  isToday,
  isYesterday,
  isSameMonth,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import {
  Search,
  Filter,
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
} from "lucide-react";
import { Tables } from "@/types/database";
import { cn } from "@/lib/utils";
import Decimal from "decimal.js";
import { toDecimal } from "@/lib/calculations/financial";

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
  const [selectedMonth, setSelectedMonth] = React.useState<Date>(() => new Date());
  const [filterType, setFilterType] = React.useState<"all" | "spent" | "income">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  // Month navigation helpers
  const handlePrevMonth = () => setSelectedMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setSelectedMonth((prev) => addMonths(prev, 1));

  // Filter transactions by selected month, search query and type filter
  const { monthTransactions, spentThisMonth, groupedDays } = React.useMemo(() => {
    let spentSum = new Decimal(0);
    const inMonth: any[] = [];

    for (const t of transactions) {
      const txDate = new Date(t.transaction_date);
      if (isSameMonth(txDate, selectedMonth)) {
        inMonth.push(t);
        if (t.transaction_type === "expense") {
          spentSum = spentSum.plus(toDecimal(t.amount || 0));
        }
      }
    }

    // Filter by type
    let filtered = inMonth;
    if (filterType === "spent") {
      filtered = filtered.filter((t) => t.transaction_type === "expense");
    } else if (filterType === "income") {
      filtered = filtered.filter(
        (t) => t.transaction_type === "income" || t.transaction_type === "refund"
      );
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
  }, [transactions, selectedMonth, filterType, searchQuery]);

  const activeAccountsCount = React.useMemo(() => {
    return accounts.filter((a) => !a.is_archived).length;
  }, [accounts]);

  // Format date header string
  const formatDayHeader = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "d MMMM yyyy");
  };

  return (
    <div className="flex flex-col space-y-4 max-w-md mx-auto pb-24 text-[#F5F5F5] select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER: ACTIVITY TITLE & ACTIONS (Reference 4 & 7)
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 px-1">
        <h1 className="text-xl font-bold tracking-tight text-[#F5F5F5] font-mono">
          Activity
        </h1>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="h-9 w-9 rounded-full bg-[#151515] border border-[#303030] flex items-center justify-center text-[#99999F] hover:text-[#F5F5F5] active:scale-95 transition-all cursor-pointer"
            aria-label="Search transactions"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            onClick={() => setSelectedMonth(new Date())}
            className="h-9 w-9 rounded-full bg-[#151515] border border-[#303030] flex items-center justify-center text-[#99999F] hover:text-[#F5F5F5] active:scale-95 transition-all cursor-pointer"
            title="Reset to current month"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* SEARCH BAR (collapsible) */}
      {isSearchOpen && (
        <div className="relative px-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#99999F]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search merchant, category, note..."
            className="w-full bg-[#151515] border border-[#303030] rounded-2xl pl-10 pr-9 py-2 text-xs text-[#F5F5F5] placeholder:text-[#99999F] focus:outline-none focus:border-[#A8C7FA]"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#99999F] hover:text-[#F5F5F5]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. MONTH NAVIGATION (Reference 4 & 7: < November 2026 >)
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-2 py-1">
        <button
          onClick={handlePrevMonth}
          className="h-8 w-8 rounded-full bg-[#151515] border border-[#303030] flex items-center justify-center text-[#99999F] hover:text-[#F5F5F5] active:scale-95 transition-colors cursor-pointer"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="text-sm font-semibold text-[#F5F5F5] font-mono tracking-wide">
          {format(selectedMonth, "MMMM yyyy")}
        </span>

        <button
          onClick={handleNextMonth}
          className="h-8 w-8 rounded-full bg-[#151515] border border-[#303030] flex items-center justify-center text-[#99999F] hover:text-[#F5F5F5] active:scale-95 transition-colors cursor-pointer"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SPENT THIS MONTH SUMMARY CARD (Reference 4 & 7)
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-[#151515] border border-[#303030] rounded-3xl p-5 shadow-xl space-y-2">
        <span className="text-[11px] text-[#99999F] font-mono uppercase tracking-wider block">
          Spent this month
        </span>
        <div className="text-3xl sm:text-4xl font-extrabold text-[#F5F5F5] font-mono tabular-nums tracking-tight">
          ₹ {spentThisMonth.toLocaleString("en-IN")}
        </div>
        <div className="text-xs text-[#99999F] font-mono flex items-center gap-1.5 pt-0.5">
          <span>{monthTransactions.length} entries</span>
          <span>•</span>
          <span>{activeAccountsCount} active accounts</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. SEGMENTED FILTER PILLS (All | Spent | Income) (Reference 4 & 7)
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#151515] border border-[#303030] rounded-2xl text-xs font-mono">
        <button
          onClick={() => setFilterType("all")}
          className={cn(
            "py-2 text-center rounded-xl transition-all cursor-pointer font-medium",
            filterType === "all"
              ? "bg-[#202020] text-[#F5F5F5] font-bold shadow-xs border border-[#303030]"
              : "text-[#99999F] hover:text-[#F5F5F5]"
          )}
        >
          All
        </button>
        <button
          onClick={() => setFilterType("spent")}
          className={cn(
            "py-2 text-center rounded-xl transition-all cursor-pointer font-medium",
            filterType === "spent"
              ? "bg-[#202020] text-[#E58A91] font-bold shadow-xs border border-[#303030]"
              : "text-[#99999F] hover:text-[#F5F5F5]"
          )}
        >
          Spent
        </button>
        <button
          onClick={() => setFilterType("income")}
          className={cn(
            "py-2 text-center rounded-xl transition-all cursor-pointer font-medium",
            filterType === "income"
              ? "bg-[#202020] text-[#80D5AE] font-bold shadow-xs border border-[#303030]"
              : "text-[#99999F] hover:text-[#F5F5F5]"
          )}
        >
          Income
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. TRANSACTIONS GROUPED BY DATE (Reference 4 & 7)
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-1">
        {groupedDays.length === 0 ? (
          <div className="p-8 bg-[#151515] border border-dashed border-[#303030] rounded-3xl text-center text-xs text-[#99999F]">
            No transactions found for this period.
          </div>
        ) : (
          groupedDays.map((group) => {
            const dateStr = formatDayHeader(group.date);
            const totalSpentNum = group.totalSpent.toNumber();

            return (
              <div key={group.date.toISOString()} className="space-y-1.5">
                {/* Date Group Header: "Yesterday • ₹15,386" */}
                <div className="flex items-center justify-between px-1 text-xs font-mono">
                  <span className="text-[#99999F] font-medium">{dateStr}</span>
                  {totalSpentNum > 0 && (
                    <span className="text-[#99999F] font-bold tabular-nums">
                      ₹{totalSpentNum.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                {/* Day's Transactions Card */}
                <div className="bg-[#151515] border border-[#303030] rounded-3xl p-3 divide-y divide-[#202020] shadow-md">
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
                        className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-xs cursor-pointer active:bg-[#202020]/50 transition-colors rounded-xl px-1"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Circular Category Icon */}
                          <div
                            className={cn(
                              "h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 border border-[#303030]",
                              isIncome
                                ? "bg-[#80D5AE]/15 text-[#80D5AE]"
                                : isTransfer
                                ? "bg-[#A8C7FA]/15 text-[#A8C7FA]"
                                : "bg-[#202020] text-[#99999F]"
                            )}
                          >
                            {getCategoryIcon(catName)}
                          </div>

                          {/* Merchant & Subtitle */}
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-[#F5F5F5] truncate">
                              {tx.merchant_or_person || tx.description}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-[#99999F] font-mono mt-0.5">
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
                                ? "text-[#80D5AE]"
                                : isTransfer
                                ? "text-[#A8C7FA]"
                                : "text-[#F5F5F5]"
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
