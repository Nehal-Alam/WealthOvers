"use client";

import * as React from "react";
import {
  format,
  subMonths,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  isToday,
} from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Flame,
  Award,
  Receipt,
  Utensils,
  ShoppingCart,
  Car,
  ShoppingBag,
  Zap,
  HeartPulse,
  Plane,
  Briefcase,
  Tag,
} from "lucide-react";
import { addMoney, subtractMoney } from "@/lib/calculations/financial";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Transaction {
  id: string;
  amount: string;
  transaction_type: string;
  transaction_date: string;
  description: string;
  category?: { id: string; name: string; color?: string } | null;
  account?: { id: string; name: string } | null;
}

interface DailySpendingScrubberProps {
  transactions: Transaction[];
}

function getCategoryIcon(name: string) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("food") || lower.includes("dining")) return <Utensils className="h-3.5 w-3.5" />;
  if (lower.includes("grocer") || lower.includes("mart")) return <ShoppingCart className="h-3.5 w-3.5" />;
  if (lower.includes("transport") || lower.includes("fuel")) return <Car className="h-3.5 w-3.5" />;
  if (lower.includes("shop") || lower.includes("cloth")) return <ShoppingBag className="h-3.5 w-3.5" />;
  if (lower.includes("bill") || lower.includes("utility")) return <Zap className="h-3.5 w-3.5" />;
  if (lower.includes("health") || lower.includes("medic")) return <HeartPulse className="h-3.5 w-3.5" />;
  if (lower.includes("travel") || lower.includes("flight")) return <Plane className="h-3.5 w-3.5" />;
  if (lower.includes("salary") || lower.includes("income")) return <Briefcase className="h-3.5 w-3.5" />;
  return <Tag className="h-3.5 w-3.5" />;
}

export function DailySpendingScrubber({ transactions }: DailySpendingScrubberProps) {
  const [selectedMonth, setSelectedMonth] = React.useState<Date>(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => new Date());

  const monthStart = React.useMemo(() => startOfMonth(selectedMonth), [selectedMonth]);
  const monthEnd = React.useMemo(() => endOfMonth(selectedMonth), [selectedMonth]);
  const daysInMonth = React.useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd]
  );

  // Group transactions in this month by date string (yyyy-MM-dd)
  const { dailyData, totalMonthSpent, totalMonthIncome, peakDay, dailyAverage } = React.useMemo(() => {
    const dailyMap: Record<string, { total: number; transactions: Transaction[] }> = {};
    let totalSpentNum = 0;
    let totalIncomeNum = 0;

    for (const d of daysInMonth) {
      const key = format(d, "yyyy-MM-dd");
      dailyMap[key] = { total: 0, transactions: [] };
    }

    for (const t of transactions) {
      const tDate = t.transaction_date.slice(0, 10);
      if (dailyMap[tDate]) {
        const amt = parseFloat(t.amount);
        if (t.transaction_type === "expense") {
          dailyMap[tDate].total += amt;
          dailyMap[tDate].transactions.push(t);
          totalSpentNum += amt;
        } else if (t.transaction_type === "income" || t.transaction_type === "refund") {
          totalIncomeNum += amt;
        }
      }
    }

    let maxSpend = 0;
    let peakDateStr = "";

    Object.entries(dailyMap).forEach(([dateStr, data]) => {
      if (data.total > maxSpend) {
        maxSpend = data.total;
        peakDateStr = dateStr;
      }
    });

    // Days elapsed in the month for average
    const now = new Date();
    const isCurrentMonth =
      selectedMonth.getFullYear() === now.getFullYear() &&
      selectedMonth.getMonth() === now.getMonth();
    const daysCounted = isCurrentMonth ? Math.max(1, now.getDate()) : daysInMonth.length;
    const avg = daysCounted > 0 ? totalSpentNum / daysCounted : 0;

    return {
      dailyData: dailyMap,
      totalMonthSpent: totalSpentNum,
      totalMonthIncome: totalIncomeNum,
      peakDay: peakDateStr ? { date: peakDateStr, amount: maxSpend } : null,
      dailyAverage: avg,
    };
  }, [transactions, daysInMonth, selectedMonth]);

  // Previous month total for MoM comparison
  const previousMonthMoM = React.useMemo(() => {
    const prevStart = startOfMonth(subMonths(selectedMonth, 1));
    const prevEnd = endOfMonth(subMonths(selectedMonth, 1));
    let prevSpent = 0;

    for (const t of transactions) {
      const parsed = parseISO(t.transaction_date);
      if (t.transaction_type === "expense" && parsed >= prevStart && parsed <= prevEnd) {
        prevSpent += parseFloat(t.amount);
      }
    }

    if (prevSpent === 0) return null;
    const diff = totalMonthSpent - prevSpent;
    const percentChange = (diff / prevSpent) * 100;
    return {
      diff,
      percentChange,
      isSaving: diff <= 0,
    };
  }, [transactions, selectedMonth, totalMonthSpent]);

  // Selected date data
  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDayInfo = dailyData[selectedDateKey] || { total: 0, transactions: [] };

  const maxDailyBar = React.useMemo(() => {
    let max = 100;
    Object.values(dailyData).forEach((d) => {
      if (d.total > max) max = d.total;
    });
    return max;
  }, [dailyData]);

  return (
    <div className="space-y-4">
      {/* Top Header & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-text-primary">
              Daily Spending Scrubber
            </h3>
            <Badge variant="outline" className="text-xs bg-surface-secondary text-text-secondary border-border/80">
              Interactive
            </Badge>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Scrub or tap individual dates to inspect day-by-day cash burn and transactions.
          </p>
        </div>

        {/* Month Selector Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedMonth((m) => subMonths(m, 1))}
            className="h-8 w-8 rounded-xl border-border bg-surface text-text-secondary hover:text-text-primary"
            aria-label="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-xs sm:text-sm font-bold text-text-primary min-w-[100px] text-center">
            {format(selectedMonth, "MMMM yyyy")}
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedMonth((m) => addMonths(m, 1))}
            className="h-8 w-8 rounded-xl border-border bg-surface text-text-secondary hover:text-text-primary"
            aria-label="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-text-secondary block">Total Spent</span>
          <span className="text-lg sm:text-xl font-bold tabular-nums text-text-primary">
            ₹{totalMonthSpent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-text-secondary block">
            Across {daysInMonth.length} calendar days
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-text-secondary block">Daily Average Spend</span>
          <span className="text-lg sm:text-xl font-bold tabular-nums text-text-primary">
            ₹{dailyAverage.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-text-secondary block">Burn rate per active day</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-text-secondary block">Peak Spending Day</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-bold tabular-nums text-danger">
              ₹{peakDay ? peakDay.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "0"}
            </span>
          </div>
          <span className="text-[10px] text-text-secondary block truncate">
            {peakDay ? format(parseISO(peakDay.date), "EEE, dd MMM") : "No expenses"}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-text-secondary block">MoM Spending Trend</span>
          {previousMonthMoM ? (
            <div className="flex items-center gap-1">
              <span
                className={`text-base sm:text-lg font-bold tabular-nums ${
                  previousMonthMoM.isSaving ? "text-success" : "text-danger"
                }`}
              >
                {previousMonthMoM.isSaving ? "-" : "+"}
                {Math.abs(previousMonthMoM.percentChange).toFixed(1)}%
              </span>
              <span className="text-[10px] text-text-secondary">
                {previousMonthMoM.isSaving ? "(Saved)" : "(Higher)"}
              </span>
            </div>
          ) : (
            <span className="text-xs text-text-secondary block italic">No previous period</span>
          )}
          <span className="text-[10px] text-text-secondary block">vs prior month</span>
        </div>
      </div>

      {/* Interactive Bar Chart Scrubber */}
      <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-text-primary">Interactive Timeline</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-danger/80" /> Daily Spend
            </span>
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-3 bg-text-secondary/50 border-t border-dashed" /> Average
            </span>
          </div>
        </div>

        {/* Scrollable / Flexible Bar Timeline */}
        <div className="pt-4 pb-2 overflow-x-auto scrollbar-none">
          <div className="min-w-[640px] h-36 flex items-end gap-1.5 px-2 relative border-b border-border/70">
            {/* Average Horizontal Reference Line */}
            {dailyAverage > 0 && (
              <div
                className="absolute left-0 right-0 border-t border-dashed border-text-secondary/40 pointer-events-none z-10"
                style={{
                  bottom: `${Math.min(95, Math.max(5, (dailyAverage / maxDailyBar) * 100))}%`,
                }}
              >
                <span className="absolute right-1 -top-4 text-[9px] font-mono text-text-secondary bg-surface px-1 rounded">
                  Avg ₹{dailyAverage.toFixed(0)}
                </span>
              </div>
            )}

            {daysInMonth.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const info = dailyData[dateKey] || { total: 0, transactions: [] };
              const isSelected = isSameDay(day, selectedDate);
              const heightPercent = maxDailyBar > 0 ? (info.total / maxDailyBar) * 100 : 0;
              const hasSpend = info.total > 0;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`flex-1 flex flex-col items-center justify-end h-full group focus:outline-none transition-all ${
                    isSelected ? "opacity-100" : "opacity-80 hover:opacity-100"
                  }`}
                  title={`${format(day, "EEE, dd MMM")}: ₹${info.total.toLocaleString("en-IN")}`}
                >
                  {/* Bar */}
                  <div
                    className={`w-full max-w-[18px] rounded-t-md transition-all ${
                      isSelected
                        ? "bg-primary shadow-xs ring-2 ring-primary/30"
                        : hasSpend
                        ? "bg-danger/70 hover:bg-danger"
                        : "bg-surface-secondary/50 hover:bg-surface-secondary"
                    }`}
                    style={{
                      height: `${Math.max(hasSpend ? 8 : 2, Math.min(100, heightPercent))}%`,
                    }}
                  />
                  {/* Day Label */}
                  <span
                    className={`text-[10px] mt-2 font-mono tabular-nums leading-none transition-colors ${
                      isSelected
                        ? "font-bold text-primary"
                        : isToday(day)
                        ? "font-bold text-text-primary"
                        : "text-text-secondary"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Day Inspection Card */}
      <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div>
            <span className="text-xs text-text-secondary block font-medium">Selected Date</span>
            <h4 className="text-sm sm:text-base font-bold text-text-primary">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
              {isToday(selectedDate) && (
                <Badge variant="outline" className="ml-2 text-[10px] bg-primary/10 text-primary border-primary/20">
                  Today
                </Badge>
              )}
            </h4>
          </div>

          <div className="text-right">
            <span className="text-xs text-text-secondary block font-medium">Total Spent</span>
            <span
              className={`text-base sm:text-lg font-bold tabular-nums ${
                selectedDayInfo.total > 0 ? "text-danger" : "text-text-secondary"
              }`}
            >
              ₹{selectedDayInfo.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Selected Day Transaction List */}
        {selectedDayInfo.transactions.length === 0 ? (
          <div className="py-6 text-center text-text-secondary">
            <Award className="mx-auto h-8 w-8 text-primary/40 mb-1.5" />
            <p className="text-xs font-semibold text-text-primary">Zero Expenses on this Day</p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              No money went out on {format(selectedDate, "MMM d")}. Safe-to-spend buffer preserved!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {selectedDayInfo.transactions.map((txn) => (
              <div key={txn.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border border-border/60"
                    style={{
                      backgroundColor: txn.category?.color ? `${txn.category.color}15` : "var(--primary-soft)",
                      color: txn.category?.color || "var(--primary)",
                    }}
                  >
                    {getCategoryIcon(txn.category?.name || "")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">
                      {txn.description}
                    </p>
                    <p className="text-[11px] text-text-secondary truncate">
                      {txn.category?.name || "Uncategorized"} · {txn.account?.name || "Account"}
                    </p>
                  </div>
                </div>

                <span className="text-xs sm:text-sm font-bold tabular-nums text-danger shrink-0">
                  -₹{parseFloat(txn.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

