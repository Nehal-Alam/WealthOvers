"use client";

import * as React from "react";
import {
  format,
  isSameMonth,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  getDate,
  isToday,
  isSameDay,
  subDays,
} from "date-fns";
import {
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Calendar as CalendarIcon,
  PieChart as PieIcon,
  Utensils,
  ShoppingCart,
  Car,
  Home,
  ShoppingBag,
  Zap,
  Coins,
  Briefcase,
  Tag,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Tables } from "@/types/database";
import { cn } from "@/lib/utils";
import Decimal from "decimal.js";
import { toDecimal } from "@/lib/calculations/financial";

interface MobileInsightsViewProps {
  transactions: any[];
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
  investments?: any[];
  assets?: any[];
  loans?: any[];
  liabilities?: any[];
}

// Category palette colors matching Reference 1 & Tailwind mobile palette
const CATEGORY_COLORS = [
  "#D7B99F", // Rent beige
  "#83D4B3", // Groceries teal
  "#80D5AE", // SIP / Investment green
  "#A8C7FA", // Blue
  "#E58A91", // Red / Expense
  "#E6BD70", // Warning yellow
  "#B388FF", // Purple
  "#FFAB91", // Coral
];

function getCategoryIcon(name: string) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("food") || lower.includes("dining") || lower.includes("restaurant") || lower.includes("cafe")) {
    return <Utensils className="h-3.5 w-3.5" />;
  }
  if (lower.includes("grocer") || lower.includes("supermarket") || lower.includes("provision")) {
    return <ShoppingCart className="h-3.5 w-3.5" />;
  }
  if (lower.includes("transport") || lower.includes("fuel") || lower.includes("cab") || lower.includes("commute") || lower.includes("uber")) {
    return <Car className="h-3.5 w-3.5" />;
  }
  if (lower.includes("rent") || lower.includes("housing") || lower.includes("home")) {
    return <Home className="h-3.5 w-3.5" />;
  }
  if (lower.includes("shop") || lower.includes("clothing") || lower.includes("shoes") || lower.includes("electronics")) {
    return <ShoppingBag className="h-3.5 w-3.5" />;
  }
  if (lower.includes("bill") || lower.includes("utility") || lower.includes("electric") || lower.includes("recharge")) {
    return <Zap className="h-3.5 w-3.5" />;
  }
  if (lower.includes("sip") || lower.includes("invest") || lower.includes("mutual") || lower.includes("stock")) {
    return <Coins className="h-3.5 w-3.5" />;
  }
  if (lower.includes("salary") || lower.includes("wage") || lower.includes("business")) {
    return <Briefcase className="h-3.5 w-3.5" />;
  }
  return <Tag className="h-3.5 w-3.5" />;
}

export function MobileInsightsView({
  transactions,
  accounts,
  categories,
  investments = [],
  assets = [],
  loans = [],
  liabilities = [],
}: MobileInsightsViewProps) {
  const [selectedMonth, setSelectedMonth] = React.useState<Date>(() => new Date());
  const [tabMode, setTabMode] = React.useState<"spending" | "income">("spending");
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  // Month navigation
  const handlePrevMonth = () => {
    setSelectedMonth((prev) => subMonths(prev, 1));
    setSelectedDate(null);
  };
  const handleNextMonth = () => {
    setSelectedMonth((prev) => addMonths(prev, 1));
    setSelectedDate(null);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 1. MONTHLY CALCULATIONS & METRICS
  // ──────────────────────────────────────────────────────────────────────────
  const {
    currentPeriodTotal,
    previousPeriodTotal,
    pctChange,
    dailySpendMap,
    maxDailySpend,
    dailyAverage,
    biggestSpend,
    categoryBreakdown,
    projectedMonthSpend,
    monthDays,
  } = React.useMemo(() => {
    const prevMonthDate = subMonths(selectedMonth, 1);

    let curTotal = new Decimal(0);
    let prevTotal = new Decimal(0);

    const dailyMap = new Map<number, Decimal>();
    const catMap = new Map<string, Decimal>();
    let biggest = { amount: 0, merchant: "None", date: selectedMonth };

    // Initialize all days of selected month
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    const daysInMonth = eachDayOfInterval({ start, end });

    for (let d = 1; d <= daysInMonth.length; d++) {
      dailyMap.set(d, new Decimal(0));
    }

    for (const t of transactions) {
      const d = new Date(t.transaction_date);
      const amt = toDecimal(t.amount || 0);

      // Current month matching
      if (isSameMonth(d, selectedMonth)) {
        const matchesMode =
          tabMode === "spending"
            ? t.transaction_type === "expense"
            : t.transaction_type === "income" || t.transaction_type === "refund";

        if (matchesMode) {
          curTotal = curTotal.plus(amt);
          const dayNum = getDate(d);
          dailyMap.set(dayNum, (dailyMap.get(dayNum) || new Decimal(0)).plus(amt));

          const catName = t.category?.name || "General";
          catMap.set(catName, (catMap.get(catName) || new Decimal(0)).plus(amt));

          if (amt.toNumber() > biggest.amount) {
            biggest = {
              amount: amt.toNumber(),
              merchant: t.merchant_or_person || t.description || "Expense",
              date: d,
            };
          }
        }
      }

      // Previous month matching
      if (isSameMonth(d, prevMonthDate)) {
        const matchesMode =
          tabMode === "spending"
            ? t.transaction_type === "expense"
            : t.transaction_type === "income" || t.transaction_type === "refund";

        if (matchesMode) {
          prevTotal = prevTotal.plus(amt);
        }
      }
    }

    // Percentage change vs previous month
    let changePct = 0;
    if (prevTotal.greaterThan(0)) {
      changePct = curTotal.minus(prevTotal).dividedBy(prevTotal).toNumber() * 100;
    }

    // Daily max for bar chart scaling
    let maxSpend = 0;
    for (const val of dailyMap.values()) {
      if (val.toNumber() > maxSpend) maxSpend = val.toNumber();
    }
    if (maxSpend === 0) maxSpend = 1;

    // Daily average based on elapsed days in month
    const now = new Date();
    const isCurrent = isSameMonth(selectedMonth, now);
    const elapsedDays = isCurrent ? Math.max(1, getDate(now)) : daysInMonth.length;
    const avg = curTotal.dividedBy(elapsedDays).toNumber();

    // Projected spend for current month
    const projected = avg * daysInMonth.length;

    // Category breakdown sorted
    const curTotalNum = curTotal.toNumber();
    const categoriesSorted = Array.from(catMap.entries())
      .map(([name, sum], index) => {
        const amount = sum.toNumber();
        const percent = curTotalNum > 0 ? Math.round((amount / curTotalNum) * 100) : 0;
        return {
          name,
          amount,
          percent,
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      currentPeriodTotal: curTotal.toNumber(),
      previousPeriodTotal: prevTotal.toNumber(),
      pctChange: changePct,
      dailySpendMap: dailyMap,
      maxDailySpend: maxSpend,
      dailyAverage: avg,
      biggestSpend: biggest,
      categoryBreakdown: categoriesSorted,
      projectedMonthSpend: projected,
      monthDays: daysInMonth,
    };
  }, [transactions, selectedMonth, tabMode]);

  // Selected Date's Transactions
  const selectedDateTransactions = React.useMemo(() => {
    if (!selectedDate) return [];
    return transactions.filter((t) => isSameDay(new Date(t.transaction_date), selectedDate));
  }, [transactions, selectedDate]);

  // Calendar grid math (empty offset cells for day of week)
  const firstDayOfWeek = React.useMemo(() => {
    return getDay(startOfMonth(selectedMonth));
  }, [selectedMonth]);

  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="flex flex-col space-y-4 max-w-md mx-auto pb-24 text-[#F5F5F5] select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER (Reference 1 & 2)
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 px-1">
        <h1 className="text-xl font-bold tracking-tight text-[#F5F5F5] font-mono">
          Insights
        </h1>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setSelectedMonth(new Date())}
            className="h-9 w-9 rounded-full bg-[#151515] border border-[#303030] flex items-center justify-center text-[#99999F] hover:text-[#F5F5F5] active:scale-95 transition-all cursor-pointer"
            title="Reset to current month"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MONTH NAVIGATION (< November 2026 >) (Reference 2)
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
          3. SPENDING | INCOME SEGMENTED TOGGLE (Reference 2)
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#151515] border border-[#303030] rounded-2xl text-xs font-mono">
        <button
          onClick={() => setTabMode("spending")}
          className={cn(
            "py-2 text-center rounded-xl transition-all cursor-pointer font-medium",
            tabMode === "spending"
              ? "bg-[#202020] text-[#F5F5F5] font-bold shadow-xs border border-[#303030]"
              : "text-[#99999F] hover:text-[#F5F5F5]"
          )}
        >
          Spending
        </button>
        <button
          onClick={() => setTabMode("income")}
          className={cn(
            "py-2 text-center rounded-xl transition-all cursor-pointer font-medium",
            tabMode === "income"
              ? "bg-[#202020] text-[#80D5AE] font-bold shadow-xs border border-[#303030]"
              : "text-[#99999F] hover:text-[#F5F5F5]"
          )}
        >
          Income
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. "SPENT IN {MONTH}" HERO CARD WITH DAILY BARS (Reference 2)
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-[#151515] border border-[#303030] rounded-3xl p-5 shadow-xl space-y-4">
        <div>
          <span className="text-[11px] text-[#99999F] font-mono uppercase tracking-wider block">
            {tabMode === "spending" ? "Spent in" : "Received in"}{" "}
            {format(selectedMonth, "MMMM")}
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#F5F5F5] font-mono tabular-nums tracking-tight mt-1">
            ₹ {currentPeriodTotal.toLocaleString("en-IN")}
          </div>

          {/* Month-over-month badge */}
          {previousPeriodTotal > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#202020] border border-[#303030] text-[10px] font-mono mt-2">
              <span
                className={cn(
                  "font-bold",
                  pctChange > 0 ? "text-[#E58A91]" : "text-[#80D5AE]"
                )}
              >
                {pctChange > 0 ? "+" : ""}
                {pctChange.toFixed(1)}%
              </span>
              <span className="text-[#99999F]">
                compared to {format(subMonths(selectedMonth, 1), "MMM")}
              </span>
            </div>
          )}
        </div>

        {/* 30/31-Day Bar Chart */}
        <div className="pt-2">
          <div className="h-28 flex items-end justify-between gap-[2px] sm:gap-1 px-1">
            {monthDays.map((d) => {
              const dayNum = getDate(d);
              const amount = dailySpendMap.get(dayNum)?.toNumber() || 0;
              const heightPct = amount > 0 ? Math.max(12, Math.round((amount / maxDailySpend) * 100)) : 4;
              const isCurrentDay = isToday(d);
              const isDaySelected = selectedDate && isSameDay(d, selectedDate);

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDate(d)}
                  className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer focus:outline-none"
                  title={`${format(d, "dd MMM")}: ₹${amount.toLocaleString("en-IN")}`}
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={cn(
                      "w-full rounded-t-sm transition-all",
                      isDaySelected
                        ? "bg-[#A8C7FA]"
                        : amount > 0
                        ? isCurrentDay
                          ? "bg-[#A8C7FA]"
                          : "bg-[#80D5AE]/70 hover:bg-[#80D5AE]"
                        : "bg-[#202020] hover:bg-[#292929]"
                    )}
                  />
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-[10px] text-[#99999F] font-mono px-1 pt-1.5">
            <span>1</span>
            <span>10</span>
            <span>20</span>
            <span>{monthDays.length}</span>
          </div>
          <span className="text-[10px] text-[#99999F] font-mono block text-center mt-1">
            Each bar represents a day of the month
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. CONTEXTUAL PACE INSIGHT (Reference 2)
      ────────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-[#202020] to-[#151515] border border-[#303030] flex items-start gap-3 shadow-md">
        <div className="h-8 w-8 rounded-full bg-[#A8C7FA]/15 text-[#A8C7FA] flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="text-xs space-y-0.5">
          <p className="text-[#F5F5F5] font-medium leading-relaxed">
            At this pace you&apos;ll spend{" "}
            <span className="font-bold text-[#A8C7FA] font-mono">
              ₹{Math.round(projectedMonthSpend).toLocaleString("en-IN")}
            </span>{" "}
            this month
            {previousPeriodTotal > 0 && (
              <>
                , {projectedMonthSpend > previousPeriodTotal ? "more" : "less"} than last month&apos;s{" "}
                <span className="text-[#99999F] font-mono">
                  ₹{previousPeriodTotal.toLocaleString("en-IN")}
                </span>
              </>
            )}
            .
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. DAILY AVERAGE & BIGGEST SPEND KPIS (Reference 2)
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-4 rounded-3xl bg-[#151515] border border-[#303030] shadow-md space-y-1">
          <span className="text-[10px] font-mono text-[#99999F] uppercase block">
            Daily average
          </span>
          <span className="text-xl font-bold font-mono text-[#F5F5F5] tabular-nums block">
            ₹{Math.round(dailyAverage).toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] text-[#99999F] font-mono block">
            Across active days
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-[#151515] border border-[#303030] shadow-md space-y-1">
          <span className="text-[10px] font-mono text-[#99999F] uppercase block">
            Biggest spend
          </span>
          <span className="text-xl font-bold font-mono text-[#E58A91] tabular-nums block">
            ₹{biggestSpend.amount.toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] text-[#99999F] truncate block font-mono">
            {biggestSpend.merchant}
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          7. CATEGORY DONUT BREAKDOWN (Reference 1)
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-[#151515] border border-[#303030] rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-[#F5F5F5] uppercase tracking-wider flex items-center gap-1.5">
            <PieIcon className="h-4 w-4 text-[#A8C7FA]" />
            Category Breakdown
          </span>
          <span className="text-[11px] font-mono text-[#99999F]">
            {categoryBreakdown.length} Categories
          </span>
        </div>

        {/* Donut SVG Indicator */}
        <div className="flex items-center justify-center py-2">
          <div className="relative h-28 w-28 flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <path
                className="text-[#202020]"
                strokeWidth="3.8"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {categoryBreakdown.map((cat, i) => {
                const prevSum = categoryBreakdown
                  .slice(0, i)
                  .reduce((sum, c) => sum + c.percent, 0);
                return (
                  <path
                    key={cat.name}
                    stroke={cat.color}
                    strokeWidth="3.8"
                    strokeDasharray={`${cat.percent}, 100`}
                    strokeDashoffset={-prevSum}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] text-[#99999F] font-mono uppercase">Top</span>
              <span className="text-xs font-bold font-mono text-[#F5F5F5] truncate max-w-[70px]">
                {categoryBreakdown[0]?.name || "None"}
              </span>
            </div>
          </div>
        </div>

        {/* Category List with Colored Progress Bars (Rent beige, Groceries teal, SIP green) */}
        <div className="space-y-3 pt-1">
          {categoryBreakdown.map((cat) => (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                    className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border border-[#303030]"
                  >
                    {getCategoryIcon(cat.name)}
                  </div>
                  <span className="font-medium text-[#F5F5F5] truncate">{cat.name}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                  <span className="font-bold text-[#F5F5F5] tabular-nums">
                    ₹{cat.amount.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] text-[#99999F] w-7 text-right">
                    {cat.percent}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full bg-[#202020] rounded-full overflow-hidden">
                <div
                  style={{ width: `${cat.percent}%`, backgroundColor: cat.color }}
                  className="h-full rounded-full transition-all"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          8. INTERACTIVE MONTHLY CALENDAR (Reference 1)
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-[#151515] border border-[#303030] rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-[#F5F5F5] uppercase tracking-wider flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4 text-[#A8C7FA]" />
            Calendar
          </span>
          <span className="text-[11px] font-mono text-[#99999F]">
            {format(selectedMonth, "MMMM yyyy")}
          </span>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-mono text-[#99999F] py-1 border-b border-[#303030]">
          {daysOfWeek.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7 gap-1 pt-1 text-xs font-mono">
          {/* Empty offset cells for starting day */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10" />
          ))}

          {/* Month Day cells */}
          {monthDays.map((d) => {
            const dayNum = getDate(d);
            const amount = dailySpendMap.get(dayNum)?.toNumber() || 0;
            const isDaySelected = selectedDate && isSameDay(d, selectedDate);
            const isTodayDate = isToday(d);

            // Spend intensity tinting
            let intensityClass = "text-[#99999F] hover:bg-[#202020]";
            if (amount > 0) {
              if (amount > dailyAverage * 1.5) {
                // High spend day: pastel blue outline/tint
                intensityClass = "bg-[#A8C7FA]/15 text-[#A8C7FA] font-bold border border-[#A8C7FA]/30";
              } else {
                // Typical spend day: subtle surface
                intensityClass = "bg-[#202020] text-[#F5F5F5] font-semibold";
              }
            }

            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDate(d)}
                className={cn(
                  "h-10 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer relative",
                  intensityClass,
                  isDaySelected &&
                    "ring-2 ring-[#A8C7FA] bg-[#A8C7FA] text-[#050505] font-extrabold shadow-md",
                  isTodayDate && !isDaySelected && "border-b-2 border-b-[#A8C7FA]"
                )}
              >
                <span>{dayNum}</span>
                {amount > 0 && (
                  <span
                    className={cn(
                      "text-[8px] leading-tight block tabular-nums",
                      isDaySelected ? "text-[#050505]" : "text-[#99999F]"
                    )}
                  >
                    {amount >= 1000 ? `${Math.round(amount / 1000)}k` : amount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Date Detail Drawer / Preview */}
        {selectedDate && (
          <div className="pt-3 border-t border-[#303030] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#A8C7FA] font-bold">
                {format(selectedDate, "dd MMMM yyyy")}
              </span>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-[10px] text-[#99999F] hover:text-[#F5F5F5]"
              >
                Clear
              </button>
            </div>

            {selectedDateTransactions.length === 0 ? (
              <p className="text-xs text-[#99999F] py-1 font-mono">
                No transactions recorded on this day.
              </p>
            ) : (
              <div className="space-y-1.5">
                {selectedDateTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-2xl bg-[#202020]/60 border border-[#303030] flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#F5F5F5] truncate">
                        {tx.merchant_or_person || tx.description}
                      </p>
                      <p className="text-[10px] text-[#99999F] font-mono">
                        {tx.category?.name || "General"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "font-mono font-bold tabular-nums text-xs",
                        tx.transaction_type === "income" ? "text-[#80D5AE]" : "text-[#F5F5F5]"
                      )}
                    >
                      {tx.transaction_type === "income" ? "+" : "-"}₹
                      {parseFloat(tx.amount).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
