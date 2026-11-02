"use client";

import * as React from "react";
import Link from "next/link";
import {
  PiggyBank,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Calendar,
  Layers,
  TrendingDown,
  Compass,
  RotateCcw,
  Target,
  Sparkles,
  Repeat,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";
import dynamic from "next/dynamic";

const CreateBudgetDialog = dynamic(
  () =>
    import("@/components/budgets/create-budget-dialog").then(
      (m) => m.CreateBudgetDialog
    ),
  { ssr: false }
);

import { deleteBudgetAction } from "@/app/(dashboard)/budgets/actions";
import {
  calculateBudgetUtilization,
  calculateDailySafeSpend,
} from "@/lib/calculations/financial";

interface BudgetWithAllocations extends Tables<"budgets"> {
  budget_categories: (Tables<"budget_categories"> & {
    category: Tables<"categories">;
  })[];
  spentByCategory?: Record<string, string>;
  totalSpent?: string;
}

interface BudgetViewProps {
  budgets: BudgetWithAllocations[];
  categories: Tables<"categories">[];
}

export function BudgetView({ budgets, categories }: BudgetViewProps) {
  const [selectedBudgetId, setSelectedBudgetId] = React.useState<string>(
    budgets[0]?.id || ""
  );

  const currentBudget = budgets.find((b) => b.id === selectedBudgetId) || budgets[0];

  const budgetStats = React.useMemo(() => {
    if (!currentBudget) return null;
    const totalAllocated = currentBudget.total_amount;
    const totalSpent = currentBudget.totalSpent || "0.0000";
    const util = calculateBudgetUtilization(totalAllocated, totalSpent);
    const dailyBurn = calculateDailySafeSpend(util.remaining, currentBudget.end_date);
    const isWarning =
      util.percentage >= currentBudget.alert_threshold_percent && !util.isOverBudget;

    return {
      totalAllocated,
      totalSpent,
      remaining: util.remaining,
      percentage: util.percentage,
      isOverBudget: util.isOverBudget,
      dailyBurn,
      isWarning,
    };
  }, [currentBudget]);

  const handleDeleteBudget = async (id: string) => {
    if (!confirm("Are you sure you want to delete this budget?")) return;
    const res = await deleteBudgetAction(id);
    if (res.success) {
      toast.success(res.message || "Budget deleted");
      const remaining = budgets.filter((b) => b.id !== id);
      if (remaining.length > 0) setSelectedBudgetId(remaining[0].id);
    } else {
      toast.error(res.error || "Failed to delete budget");
    }
  };

  if (!currentBudget) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">
              Monthly Budgets & Limits
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
              Define spending limits and track category-level utilization.
            </p>
          </div>
          <CreateBudgetDialog categories={categories} />
        </div>

        {/* Unified Plan Tabs */}
        <div className="flex items-center gap-1 p-1 bg-surface-secondary/70 rounded-xl border border-border/70 w-fit">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-surface shadow-2xs">
            <Layers className="h-3.5 w-3.5" />
            <span>Monthly Budgets</span>
          </div>

          <Link
            href="/goals"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary transition-all"
          >
            <Target className="h-3.5 w-3.5" />
            <span>Financial Goals</span>
          </Link>

          <Link
            href="/recurring"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary transition-all"
          >
            <Repeat className="h-3.5 w-3.5" />
            <span>Recurring & Bills</span>
          </Link>
        </div>

        {/* Leftovers Onboarding Empty State */}
        <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-surface">
          <PiggyBank className="mx-auto h-12 w-12 text-text-secondary/40 mb-3" />
          <h3 className="text-base font-semibold text-text-primary">
            Create a monthly spending plan to understand how much you can spend
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 mb-4 max-w-md mx-auto">
            Set up spending envelopes across dining, groceries, and bills to power your Safe-to-Spend pacing.
          </p>
          <CreateBudgetDialog categories={categories} />
        </div>
      </div>
    );
  }

  const {
    totalAllocated,
    totalSpent,
    remaining,
    percentage,
    isOverBudget,
    dailyBurn,
    isWarning,
  } = budgetStats!;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">{currentBudget.name}</h2>
          <p className="text-xs sm:text-sm text-text-secondary flex items-center gap-2 mt-0.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>
              {format(new Date(currentBudget.start_date), "dd MMM yyyy")} –{" "}
              {format(new Date(currentBudget.end_date), "dd MMM yyyy")}
            </span>
            {currentBudget.rollover_enabled && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 bg-surface-secondary text-text-secondary rounded-md">
                Rollover Active
              </Badge>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {budgets.length > 1 && (
            <select
              value={selectedBudgetId}
              onChange={(e) => setSelectedBudgetId(e.target.value)}
              className="h-9 rounded-xl border border-border bg-surface px-3 py-1 text-xs text-text-primary shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {budgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <CreateBudgetDialog categories={categories} />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-text-secondary hover:text-danger rounded-xl"
            onClick={() => handleDeleteBudget(currentBudget.id)}
            aria-label="Delete budget"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Unified Plan Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-secondary/70 rounded-xl border border-border/70 w-fit">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-surface shadow-2xs">
          <Layers className="h-3.5 w-3.5" />
          <span>Monthly Budgets</span>
        </div>

        <Link
          href="/goals"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary transition-all"
        >
          <Target className="h-3.5 w-3.5" />
          <span>Financial Goals</span>
        </Link>

        <Link
          href="/recurring"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary transition-all"
        >
          <Repeat className="h-3.5 w-3.5" />
          <span>Recurring & Bills</span>
        </Link>
      </div>

      {/* Overspending Alert Banner */}
      {isOverBudget && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-danger/30 bg-danger/10 text-danger shadow-2xs">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold">Budget Exceeded!</span> You have spent{" "}
            <MoneyDisplay amount={totalSpent} className="font-bold" /> of your{" "}
            <MoneyDisplay amount={totalAllocated} className="font-bold" /> limit (
            {percentage}% utilized).
          </div>
        </div>
      )}

      {isWarning && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-warning/30 bg-warning/10 text-warning shadow-2xs">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold">Budget Alert Threshold Reached:</span>{" "}
            You have used {percentage}% of your planned spending for this period.
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Budget"
          amount={totalAllocated}
          subtitle="Monthly planned spending cap"
          icon={PiggyBank}
          iconColor="forest"
        />
        <MetricCard
          title="Total Spent"
          amount={totalSpent}
          subtitle={`${percentage}% of budget utilized`}
          icon={TrendingDown}
          iconColor={isOverBudget ? "coral" : isWarning ? "coral" : "emerald"}
          coloredAmount={false}
        />
        <MetricCard
          title="Remaining Budget"
          amount={remaining}
          subtitle={isOverBudget ? "Over budget limit" : "Safe envelope buffer"}
          icon={CheckCircle2}
          iconColor={isOverBudget ? "coral" : "emerald"}
          coloredAmount
        />
        <MetricCard
          title="Daily Safe Velocity"
          amount={dailyBurn.dailySafeSpend}
          subtitle={
            isOverBudget
              ? "Exceeded — restrict spend"
              : `${dailyBurn.daysRemaining} days left in cycle`
          }
          icon={Compass}
          iconColor={isOverBudget ? "coral" : "indigo"}
          coloredAmount={!isOverBudget}
        />
      </div>

      {/* Rollover Active Banner */}
      {currentBudget.rollover_enabled && (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-primary/20 bg-primary/5 text-text-primary text-xs shadow-2xs">
          <RotateCcw className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1">
            <span className="font-semibold text-primary">Envelope Rollover Active:</span>{" "}
            Any unspent balance at the end of this cycle automatically rolls into your next budget period.
          </div>
        </div>
      )}

      {/* Main Budget Progress Card */}
      <Card className="rounded-2xl border border-border/80 bg-surface shadow-2xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-text-primary">
              Overall Budget Progress
            </CardTitle>
            <span
              className={`text-sm font-bold font-mono tabular-nums ${
                isOverBudget
                  ? "text-danger"
                  : isWarning
                  ? "text-warning"
                  : "text-success"
              }`}
            >
              {percentage}%
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-1 space-y-2">
          <Progress
            value={Math.min(percentage, 100)}
            indicatorClassName={
              isOverBudget
                ? "bg-danger"
                : isWarning
                ? "bg-warning"
                : "bg-success"
            }
            className="h-2.5 rounded-full bg-surface-secondary"
          />
          <div className="flex justify-between text-xs text-text-secondary pt-1">
            <span>Spent: <MoneyDisplay amount={totalSpent} className="font-semibold text-text-primary" /></span>
            <span>Limit: <MoneyDisplay amount={totalAllocated} className="font-semibold text-text-primary" /></span>
          </div>
        </CardContent>
      </Card>

      {/* Category Allocations Breakdown (Envelope Cards) */}
      {currentBudget.budget_categories &&
        currentBudget.budget_categories.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span>Category Spending Envelopes ({currentBudget.budget_categories.length})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentBudget.budget_categories.map((alloc) => {
                const spent = currentBudget.spentByCategory?.[alloc.category_id] || "0.0000";
                const util = calculateBudgetUtilization(alloc.allocated_amount, spent);

                return (
                  <Card key={alloc.id} className="p-4 shadow-2xs border border-border/80 bg-surface rounded-2xl space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{
                            backgroundColor: alloc.category?.color || "var(--primary)",
                          }}
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-sm text-text-primary block truncate">
                            {alloc.category?.name || "Category"}
                          </span>
                          <span className="text-[11px] text-text-secondary">
                            {util.isOverBudget ? "Over by " : "Remaining: "}
                            <MoneyDisplay
                              amount={util.remaining}
                              className={
                                util.isOverBudget
                                  ? "text-danger font-bold"
                                  : "text-success font-bold"
                              }
                            />
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-2 h-4.5 font-mono font-bold rounded-md ${
                            util.isOverBudget
                              ? "border-danger/30 text-danger bg-danger/10"
                              : util.percentage >= currentBudget.alert_threshold_percent
                              ? "border-warning/30 text-warning bg-warning/10"
                              : "border-success/30 text-success bg-success/10"
                          }`}
                        >
                          {util.percentage}%
                        </Badge>
                      </div>
                    </div>

                    <Progress
                      value={Math.min(util.percentage, 100)}
                      indicatorClassName={
                        util.isOverBudget
                          ? "bg-danger"
                          : util.percentage >= currentBudget.alert_threshold_percent
                          ? "bg-warning"
                          : "bg-success"
                      }
                      className="h-2 rounded-full bg-surface-secondary"
                    />

                    <div className="flex justify-between text-xs text-text-secondary pt-0.5">
                      <span>Spent: <MoneyDisplay amount={spent} className="font-semibold text-text-primary" /></span>
                      <span>Limit: <MoneyDisplay amount={alloc.allocated_amount} className="font-semibold text-text-primary" /></span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
    </div>
  );
}
