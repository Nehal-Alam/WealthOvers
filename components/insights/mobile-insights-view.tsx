"use client";

import * as React from "react";
import {
  format,
  isToday,
  isSameDay,
  isSameMonth,
  subMonths,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDate,
  getDay,
} from "date-fns";
import {
  PieChart as PieIcon,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
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
} from "lucide-react";
import { Tables } from "@/types/database";
import { cn } from "@/lib/utils";
import Decimal from "decimal.js";
import { toDecimal } from "@/lib/calculations/financial";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface MobileInsightsViewProps {
  transactions: any[];
  categories: Tables<"categories">[];
  accounts: Tables<"accounts">[];
  investments?: any[];
  assets?: any[];
  loans?: any[];
  liabilities?: any[];
}

function getCategoryIcon(name: string) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("food") || lower.includes("dining") || lower.includes("restaurant") || lower.includes("cafe")) {
    return <Utensils className="h-4 w-4" />;
  }
  if (lower.includes("grocer") || lower.includes("supermarket") || lower.includes("provision")) {
    return <ShoppingCart className="h-4 w-4" />;
  }
  if (lower.includes("transport") || lower.includes("fuel") || lower.includes("cab") || lower.includes("commute")) {
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
  if (lower.includes("sip") || lower.includes("invest") || lower.includes("mutual") || lower.includes("stock")) {
    return <Coins className="h-4 w-4" />;
  }
  if (lower.includes("salary") || lower.includes("wage") || lower.includes("payroll") || lower.includes("business")) {
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

export function MobileInsightsView({
  transactions,
  categories,
  accounts,
}: MobileInsightsViewProps) {
  const [selectedMonth, setSelectedMonth] = React.useState<Date>(() => new Date());
  const [tabMode, setTabMode] = React.useState<"spending" | "income">("spending");
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  // Month navigation helpers
  const handlePrevMonth = () => setSelectedMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setSelectedMonth((prev) => addMonths(prev, 1));

  // Current month intervals
  const monthStart = React.useMemo(() => startOfMonth(selectedMonth), [selectedMonth]);
  const monthEnd = React.useMemo(() => endOfMonth(selectedMonth), [selectedMonth]);
  const monthDays = React.useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd]
  );

  // Filter transactions for this month vs previous month
  const {
    currentPeriodTransactions,
    currentPeriodTotal,
    previousPeriodTotal,
    dailySpendMap,
    maxDailySpend,
    categoryBreakdown,
    dailyAverage,
    biggestSpend,
    projectedMonthSpend,
  } = React.useMemo(() => {
    let currentTotal = new Decimal(0);
    let prevTotal = new Decimal(0);
    const prevMonth = subMonths(selectedMonth, 1);
    const dayMap = new Map<number, Decimal>();
    const catMap = new Map<string, { total: Decimal; color: string }>();

    let maxDaily = new Decimal(0);
    let biggest = { merchant: "None", amount: 0 };
    const currentTxs: any[] = [];

    const targetType = tabMode === "spending" ? "expense" : "income";

    for (const t of transactions) {
      const d = new Date(t.transaction_date);
      const isTarget =
        targetType === "income"
          ? t.transaction_type === "income" || t.transaction_type === "refund"
          : t.transaction_type === "expense";

      if (!isTarget) continue;

      const amt = toDecimal(t.amount || 0);

      // Current month check
      if (isSameMonth(d, selectedMonth)) {
        currentTxs.push(t);
        currentTotal = currentTotal.plus(amt);

        const dayNum = getDate(d);
        const dayTotal = (dayMap.get(dayNum) || new Decimal(0)).plus(amt);
        dayMap.set(dayNum, dayTotal);
        if (dayTotal.greaterThan(maxDaily)) {
          maxDaily = dayTotal;
        }

        // Category grouping
        const catName = t.category?.name || "General";
        const catColor = t.category?.color || "#A8C7FA";
        const existingCat = catMap.get(catName) || { total: new Decimal(0), color: catColor };
        existingCat.total = existingCat.total.plus(amt);
        catMap.set(catName, existingCat);

        // Biggest spend tracking
        if (amt.toNumber() > biggest.amount) {
          biggest = {
            merchant: t.merchant_or_person || t.description || catName,
            amount: amt.toNumber(),
          };
        }
      } else if (isSameMonth(d, prevMonth)) {
        prevTotal = prevTotal.plus(amt);
      }
    }

    // Category breakdown sorted descending
    const catArray = Array.from(catMap.entries())
      .map(([name, data]) => {
        const val = data.total.toNumber();
        const pct = currentTotal.greaterThan(0)
          ? Math.round((val / currentTotal.toNumber()) * 100)
          : 0;
        return { name, amount: val, percent: pct, color: data.color };
      })
      .sort((a, b) => b.amount - a.amount);

    // Calculate daily average across active days passed
    const isCur = isSameMonth(selectedMonth, new Date());
    const daysElapsed = isCur ? Math.max(1, getDate(new Date())) : monthDays.length;
    const avgDaily = currentTotal.dividedBy(daysElapsed).toNumber();

    // Projected spend for full month
    const projected = currentTotal.dividedBy(daysElapsed).times(monthDays.length).toNumber();

    return {
      currentPeriodTransactions: currentTxs,
      currentPeriodTotal: currentTotal.toNumber(),
      previousPeriodTotal: prevTotal.toNumber(),
      dailySpendMap: dayMap,
      maxDailySpend: maxDaily.toNumber() || 1,
      categoryBreakdown: catArray,
      dailyAverage: avgDaily,
      biggestSpend: biggest,
      projectedMonthSpend: projected,
    };
  }, [transactions, selectedMonth, tabMode, monthDays]);

  // Selected date transactions for interactive calendar
  const selectedDateTransactions = React.useMemo(() => {
    if (!selectedDate) return [];
    return currentPeriodTransactions.filter((t) =>
      isSameDay(new Date(t.transaction_date), selectedDate)
    );
  }, [currentPeriodTransactions, selectedDate]);

  // Calendar weekday grid calculation
  const firstDayOfWeek = getDay(monthStart); // 0 = Sunday
  const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];

  // Percent change vs previous month
  const pctChange = previousPeriodTotal > 0
    ? ((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal) * 100
    : 0;

  return (
    <div className="flex flex-col space-y-4 max-w-md mx-auto pb-24 text-mobile-primary select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER (Title & Theme Toggle)
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 px-1">
        <h1 className="text-xl font-bold tracking-tight text-mobile-primary font-mono">
          Insights
        </h1>

        <div className="flex items-center space-x-1.5">
          <div className="h-9 w-9 rounded-full bg-mobile-surface border border-mobile-border flex items-center justify-center text-mobile-secondaryText hover:text-mobile-primary transition-all">
            <ThemeToggle />
          </div>

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
          2. MONTH NAVIGATION
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
          3. SPENDING | INCOME SEGMENTED TOGGLE
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-mobile-surface border border-mobile-border rounded-2xl text-xs font-mono">
        <button
          onClick={() => setTabMode("spending")}
          className={cn(
            "py-2 text-center rounded-xl transition-all cursor-pointer font-medium",
            tabMode === "spending"
              ? "bg-mobile-secondary text-mobile-primary font-bold shadow-xs border border-mobile-border"
              : "text-mobile-secondaryText hover:text-mobile-primary"
          )}
        >
          Spending
        </button>
        <button
          onClick={() => setTabMode("income")}
          className={cn(
            "py-2 text-center rounded-xl transition-all cursor-pointer font-medium",
            tabMode === "income"
              ? "bg-mobile-secondary text-mobile-income font-bold shadow-xs border border-mobile-border"
              : "text-mobile-secondaryText hover:text-mobile-primary"
          )}
        >
          Income
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. "SPENT IN {MONTH}" HERO CARD WITH DAILY BARS
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-mobile-surface border border-mobile-border rounded-3xl p-5 shadow-xl space-y-4">
        <div>
          <span className="text-[11px] text-mobile-secondaryText font-mono uppercase tracking-wider block">
            {tabMode === "spending" ? "Spent in" : "Received in"}{" "}
            {format(selectedMonth, "MMMM")}
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold text-mobile-primary font-mono tabular-nums tracking-tight mt-1">
            ₹ {currentPeriodTotal.toLocaleString("en-IN")}
          </div>

          {/* Month-over-month badge */}
          {previousPeriodTotal > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-mobile-secondary border border-mobile-border text-[10px] font-mono mt-2">
              <span
                className={cn(
                  "font-bold",
                  pctChange > 0 ? "text-mobile-expense" : "text-mobile-income"
                )}
              >
                {pctChange > 0 ? "+" : ""}
                {pctChange.toFixed(1)}%
              </span>
              <span className="text-mobile-secondaryText">
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
                        ? "bg-mobile-accent"
                        : amount > 0
                        ? isCurrentDay
                          ? "bg-mobile-accent"
                          : "bg-mobile-income/70 hover:bg-mobile-income"
                        : "bg-mobile-secondary hover:bg-mobile-secondary/80"
                    )}
                  />
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-[10px] text-mobile-secondaryText font-mono px-1 pt-1.5">
            <span>1</span>
            <span>10</span>
            <span>20</span>
            <span>{monthDays.length}</span>
          </div>
          <span className="text-[10px] text-mobile-secondaryText font-mono block text-center mt-1">
            Each bar represents a day of the month
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. CONTEXTUAL PACE INSIGHT
      ────────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-3xl bg-mobile-surface border border-mobile-border flex items-start gap-3 shadow-md">
        <div className="h-8 w-8 rounded-full bg-mobile-accent/15 text-mobile-accent flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="text-xs space-y-0.5">
          <p className="text-mobile-primary font-medium leading-relaxed">
            At this pace you&apos;ll spend{" "}
            <span className="font-bold text-mobile-accent font-mono">
              ₹{Math.round(projectedMonthSpend).toLocaleString("en-IN")}
            </span>{" "}
            this month
            {previousPeriodTotal > 0 && (
              <>
                , {projectedMonthSpend > previousPeriodTotal ? "more" : "less"} than last month&apos;s{" "}
                <span className="text-mobile-secondaryText font-mono">
                  ₹{previousPeriodTotal.toLocaleString("en-IN")}
                </span>
              </>
            )}
            .
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. DAILY AVERAGE & BIGGEST SPEND KPIS
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-4 rounded-3xl bg-mobile-surface border border-mobile-border shadow-md space-y-1">
          <span className="text-[10px] font-mono text-mobile-secondaryText uppercase block">
            Daily average
          </span>
          <span className="text-xl font-bold font-mono text-mobile-primary tabular-nums block">
            ₹{Math.round(dailyAverage).toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] text-mobile-secondaryText font-mono block">
            Across active days
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-mobile-surface border border-mobile-border shadow-md space-y-1">
          <span className="text-[10px] font-mono text-mobile-secondaryText uppercase block">
            Biggest spend
          </span>
          <span className="text-xl font-bold font-mono text-mobile-expense tabular-nums block">
            ₹{biggestSpend.amount.toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] text-mobile-secondaryText truncate block font-mono">
            {biggestSpend.merchant}
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          7. CATEGORY DONUT BREAKDOWN
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-mobile-surface border border-mobile-border rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-mobile-primary uppercase tracking-wider flex items-center gap-1.5">
            <PieIcon className="h-4 w-4 text-mobile-accent" />
            Category Breakdown
          </span>
          <span className="text-[11px] font-mono text-mobile-secondaryText">
            {categoryBreakdown.length} Categories
          </span>
        </div>

        {/* Donut SVG Indicator */}
        <div className="flex items-center justify-center py-2">
          <div className="relative h-28 w-28 flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <path
                className="text-mobile-secondary"
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
              <span className="text-[10px] text-mobile-secondaryText font-mono uppercase">Top</span>
              <span className="text-xs font-bold font-mono text-mobile-primary truncate max-w-[70px]">
                {categoryBreakdown[0]?.name || "None"}
              </span>
            </div>
          </div>
        </div>

        {/* Category List with Colored Progress Bars */}
        <div className="space-y-3 pt-1">
          {categoryBreakdown.map((cat) => (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                    className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border border-mobile-border"
                  >
                    {getCategoryIcon(cat.name)}
                  </div>
                  <span className="font-medium text-mobile-primary truncate">{cat.name}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                  <span className="font-bold text-mobile-primary tabular-nums">
                    ₹{cat.amount.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] text-mobile-secondaryText w-7 text-right">
                    {cat.percent}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full bg-mobile-secondary rounded-full overflow-hidden">
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
          8. INTERACTIVE MONTHLY CALENDAR
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-mobile-surface border border-mobile-border rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-mobile-primary uppercase tracking-wider flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4 text-mobile-accent" />
            Calendar
          </span>
          <span className="text-[11px] font-mono text-mobile-secondaryText">
            {format(selectedMonth, "MMMM yyyy")}
          </span>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-mono text-mobile-secondaryText py-1 border-b border-mobile-border">
          {daysOfWeek.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7 gap-1 pt-1 text-xs font-mono">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10" />
          ))}

          {monthDays.map((d) => {
            const dayNum = getDate(d);
            const amount = dailySpendMap.get(dayNum)?.toNumber() || 0;
            const isDaySelected = selectedDate && isSameDay(d, selectedDate);
            const isTodayDate = isToday(d);

            let intensityClass = "text-mobile-secondaryText hover:bg-mobile-secondary";
            if (amount > 0) {
              if (amount > dailyAverage * 1.5) {
                intensityClass = "bg-mobile-accent/15 text-mobile-accent font-bold border border-mobile-accent/30";
              } else {
                intensityClass = "bg-mobile-secondary text-mobile-primary font-semibold";
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
                    "ring-2 ring-mobile-accent bg-mobile-accent text-background font-extrabold shadow-md",
                  isTodayDate && !isDaySelected && "border-b-2 border-b-mobile-accent"
                )}
              >
                <span>{dayNum}</span>
                {amount > 0 && (
                  <span
                    className={cn(
                      "text-[8px] leading-tight block tabular-nums",
                      isDaySelected ? "text-background" : "text-mobile-secondaryText"
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
          <div className="pt-3 border-t border-mobile-border space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-mobile-accent font-bold">
                {format(selectedDate, "dd MMMM yyyy")}
              </span>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-[10px] text-mobile-secondaryText hover:text-mobile-primary"
              >
                Clear
              </button>
            </div>

            {selectedDateTransactions.length === 0 ? (
              <p className="text-xs text-mobile-secondaryText py-1 font-mono">
                No transactions recorded on this day.
              </p>
            ) : (
              <div className="space-y-1.5">
                {selectedDateTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-2xl bg-mobile-secondary/60 border border-mobile-border flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-mobile-primary truncate">
                        {tx.merchant_or_person || tx.description}
                      </p>
                      <p className="text-[10px] text-mobile-secondaryText font-mono">
                        {tx.category?.name || "General"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "font-mono font-bold tabular-nums text-xs",
                        tx.transaction_type === "income" ? "text-mobile-income" : "text-mobile-primary"
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
