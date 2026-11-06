"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  PieChart,
  Calendar,
  AlertCircle,
  PiggyBank,
  ArrowRight,
} from "lucide-react";

import { Tables } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";
import { toDecimal, addMoney } from "@/lib/calculations/financial";

interface PlanAnalyticsProps {
  budgets: any[];
  transactions: any[];
  categories: Tables<"categories">[];
}

export function PlanAnalytics({
  budgets,
  transactions,
  categories,
}: PlanAnalyticsProps) {
  // Aggregate category spending from actual transactions
  const categorySpending = React.useMemo(() => {
    const map = new Map<string, { category: Tables<"categories">; total: string; count: number }>();

    for (const cat of categories) {
      map.set(cat.id, { category: cat, total: "0.0000", count: 0 });
    }

    let grandTotal = "0.0000";

    for (const tx of transactions) {
      if (!tx.category_id) continue;
      grandTotal = addMoney(grandTotal, tx.amount);
      const entry = map.get(tx.category_id);
      if (entry) {
        entry.total = addMoney(entry.total, tx.amount);
        entry.count++;
      }
    }

    const grandTotalNum = parseFloat(grandTotal);

    return Array.from(map.values())
      .filter((e) => toDecimal(e.total).gt(0))
      .map((e) => ({
        ...e,
        percentage:
          grandTotalNum > 0
            ? Math.round((parseFloat(e.total) / grandTotalNum) * 100)
            : 0,
      }))
      .sort((a, b) => toDecimal(b.total).minus(toDecimal(a.total)).toNumber());
  }, [categories, transactions]);

  const hasData = budgets.length > 0 || transactions.length > 0;

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-surface space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-base font-bold text-text-primary">
            No spending data to analyze
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Analytics and forecasts will populate automatically as you record transactions and maintain your monthly spending budgets.
          </p>
        </div>
      </div>
    );
  }

  // Budget vs Actual comparison
  const totalBudgeted = budgets.reduce(
    (acc, b) => addMoney(acc, b.total_amount),
    "0.0000"
  );
  const totalActual = transactions.reduce(
    (acc, t) => addMoney(acc, t.amount),
    "0.0000"
  );
  const variance = toDecimal(totalBudgeted).minus(toDecimal(totalActual)).toFixed(2);
  const isUnderBudget = toDecimal(variance).gte(0);

  return (
    <div className="space-y-6">
      {/* Overview Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Budgeted"
          amount={totalBudgeted}
          subtitle="Sum of active limits"
          icon={PiggyBank}
          iconColor="forest"
        />
        <MetricCard
          title="Actual Spending"
          amount={totalActual}
          subtitle="Eligible expenses in period"
          icon={TrendingDown}
          iconColor={isUnderBudget ? "emerald" : "coral"}
          coloredAmount={false}
        />
        <MetricCard
          title="Budget Variance"
          amount={variance}
          subtitle={isUnderBudget ? "Favorable buffer" : "Unfavorable deficit"}
          icon={TrendingUp}
          iconColor={isUnderBudget ? "emerald" : "coral"}
          coloredAmount
        />
      </div>

      {/* Category Spending Breakdown */}
      <Card className="rounded-2xl border border-border/80 bg-surface shadow-2xs">
        <CardHeader className="p-4 pb-2 border-b border-border/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold text-text-primary">
                Category Spending Distribution
              </CardTitle>
            </div>
            <span className="text-xs text-text-secondary">
              Derived from {transactions.length} recorded expense transactions
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {categorySpending.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-4">
              No categorized expenses recorded in this period.
            </p>
          ) : (
            <div className="space-y-3">
              {categorySpending.map((item) => (
                <div key={item.category.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.category.color || "var(--primary)" }}
                      />
                      <span>{item.category.name}</span>
                      <span className="text-[10px] text-text-secondary font-normal">
                        ({item.count} transaction{item.count !== 1 ? "s" : ""})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <MoneyDisplay amount={item.total} />
                      <span className="text-text-secondary font-bold">
                        ({item.percentage}%)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={item.percentage}
                    className="h-2 rounded-full bg-surface-secondary"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

