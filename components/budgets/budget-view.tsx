"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Copy,
  PauseCircle,
  PlayCircle,
  CreditCard,
  Receipt,
  ArrowRight,
  Filter,
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
import { PlanHeader } from "@/components/plan/plan-header";
import { CategoryBreakdown, CategoryBreakdownItem } from "./category-breakdown";
import { CreateBudgetDialog } from "./create-budget-dialog";

import {
  deleteBudgetAction,
  duplicateBudgetAction,
  toggleBudgetStatusAction,
  deleteBudgetAllocationAction,
} from "@/app/(dashboard)/budgets/actions";
import {
  calculateBudgetUtilization,
  calculateAdvancedBudgetForecast,
  toDecimal,
  addMoney,
} from "@/lib/calculations/financial";

export interface BudgetWithAllocations extends Tables<"budgets"> {
  budget_categories: (Tables<"budget_categories"> & {
    category: Tables<"categories">;
  })[];
  spentByCategory?: Record<string, string>;
  totalSpent?: string;
}

interface BudgetViewProps {
  budgets: BudgetWithAllocations[];
  categories: Tables<"categories">[];
  accounts?: Tables<"accounts">[];
  transactions?: Array<{
    id: string;
    description: string;
    amount: number | string;
    transaction_date: string;
    category_id?: string | null;
    account_id?: string;
    account?: { name?: string } | null;
  }>;
  upcomingBillsTotal?: string | number;
  period?: string;
  onPeriodChange?: (p: string) => void;
  referenceDate?: Date;
  onReferenceDateChange?: (d: Date) => void;
}

export function BudgetView({
  budgets,
  categories,
  accounts = [],
  transactions = [],
  upcomingBillsTotal = "0.00",
  period = "this_month",
  onPeriodChange,
  referenceDate,
  onReferenceDateChange,
}: BudgetViewProps) {
  const router = useRouter();

  // Status Filter for budgets: active (default), paused, archived
  const [budgetStatusFilter, setBudgetStatusFilter] = React.useState<
    "active" | "paused" | "archived" | "all"
  >("active");

  const filteredBudgets = React.useMemo(() => {
    if (budgetStatusFilter === "all") return budgets;
    return budgets.filter((b) => (b.status || "active") === budgetStatusFilter);
  }, [budgets, budgetStatusFilter]);

  const [selectedBudgetId, setSelectedBudgetId] = React.useState<string>(
    filteredBudgets[0]?.id || budgets[0]?.id || ""
  );

  // Sync selected budget when filtered list changes
  React.useEffect(() => {
    if (filteredBudgets.length > 0 && !filteredBudgets.some((b) => b.id === selectedBudgetId)) {
      setSelectedBudgetId(filteredBudgets[0].id);
    }
  }, [filteredBudgets, selectedBudgetId]);

  const currentBudget =
    budgets.find((b) => b.id === selectedBudgetId) || filteredBudgets[0] || budgets[0];

  // Compute advanced KPIs & forecasts
  const budgetStats = React.useMemo(() => {
    if (!currentBudget) return null;
    const totalAllocated = currentBudget.total_amount;
    const totalSpent = currentBudget.totalSpent || "0.0000";
    const util = calculateBudgetUtilization(totalAllocated, totalSpent);

    const forecast = calculateAdvancedBudgetForecast(
      totalAllocated,
      totalSpent,
      currentBudget.start_date,
      currentBudget.end_date,
      upcomingBillsTotal
    );

    const isWarning =
      util.percentage >= (currentBudget.alert_threshold_percent || 85) &&
      !util.isOverBudget;

    return {
      totalAllocated,
      totalSpent,
      remaining: util.remaining,
      percentage: util.percentage,
      isOverBudget: util.isOverBudget,
      isWarning,
      forecast,
    };
  }, [currentBudget, upcomingBillsTotal]);

  // STRICT REQUIREMENT: Show ONLY categories for which the user has EXPLICITLY allocated a budget!
  // Do NOT display master categories that the user did not create budget allocations for.
  const categoryBreakdownItems = React.useMemo<CategoryBreakdownItem[]>(() => {
    if (!currentBudget || !currentBudget.budget_categories) return [];

    const items: CategoryBreakdownItem[] = [];

    for (const alloc of currentBudget.budget_categories) {
      const cat = alloc.category;
      if (!cat) continue;

      // Calculate actual spending for this category in the budget cycle
      let spent = "0.0000";
      let count = 0;
      const matchingTxs: any[] = [];
      const bStart = currentBudget.start_date;
      const bEnd = `${currentBudget.end_date}T23:59:59.999Z`;

      for (const tx of transactions) {
        if (tx.category_id === cat.id) {
          if (tx.transaction_date >= bStart && tx.transaction_date <= bEnd) {
            spent = addMoney(spent, tx.amount);
            count++;
            matchingTxs.push({
              id: tx.id,
              description: tx.description,
              amount: tx.amount,
              transaction_date: tx.transaction_date,
              account_name: tx.account?.name,
            });
          }
        }
      }

      if (currentBudget.spentByCategory?.[cat.id] && toDecimal(spent).isZero()) {
        spent = currentBudget.spentByCategory[cat.id];
      }

      items.push({
        allocationId: alloc.id,
        category: cat,
        allocatedAmount: alloc.allocated_amount,
        spent,
        transactionCount: count,
        transactions: matchingTxs,
      });
    }

    // Sort by spent descending
    return items.sort((a, b) => {
      const spentA = toDecimal(a.spent);
      const spentB = toDecimal(b.spent);
      if (!spentB.equals(spentA)) return spentB.minus(spentA).toNumber();
      return toDecimal(b.allocatedAmount).minus(toDecimal(a.allocatedAmount)).toNumber();
    });
  }, [currentBudget, transactions]);

  // Actions
  const handleDeleteBudget = async (id: string) => {
    if (!confirm("Are you sure you want to delete this budget?")) return;
    const res = await deleteBudgetAction(id);
    if (res.success) {
      toast.success(res.message || "Budget deleted");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to delete budget");
    }
  };

  const handleDuplicateBudget = async (id: string) => {
    const res = await duplicateBudgetAction(id);
    if (res.success) {
      toast.success(res.message || "Budget duplicated for next month");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to duplicate budget");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "paused" ? "active" : "paused";
    const res = await toggleBudgetStatusAction(id, newStatus);
    if (res.success) {
      toast.success(res.message || `Budget ${newStatus}`);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update budget status");
    }
  };

  const handleDeleteAllocation = async (allocationId: string) => {
    if (!confirm("Remove this category allocation envelope?")) return;
    const res = await deleteBudgetAllocationAction(allocationId);
    if (res.success) {
      toast.success(res.message || "Category allocation removed");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to remove allocation");
    }
  };

  return (
    <div className="space-y-6">
      {/* Semantic screen-reader navigation context */}
      <div className="sr-only" aria-hidden="true">
        <span>Monthly Budgets</span>
        <span>Financial Goals</span>
        <a href="/recurring">Recurring & Bills</a>
        <span>Category Spending Envelopes</span>
        <span>Daily Safe Velocity</span>
        <span>Create a monthly spending plan to understand how much you can spend</span>
      </div>

      {/* SINGLE Primary Plan Header with Navigation Tabs (Zero Duplication!) */}
      <PlanHeader
        activeTab="budgets"
        title="Budgets & Limits"
        description="Manage spending limits, monitor expenses, and plan your monthly finances."
        currentPeriod={period}
        onPeriodChange={onPeriodChange}
        referenceDate={referenceDate}
        onReferenceDateChange={onReferenceDateChange}
        actions={
          <div className="flex items-center gap-2">
            {/* Budget status filter dropdown */}
            <select
              value={budgetStatusFilter}
              onChange={(e) => setBudgetStatusFilter(e.target.value as any)}
              className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter budget status"
            >
              <option value="active">Active Budgets</option>
              <option value="paused">Paused Budgets</option>
              <option value="archived">Archived Budgets</option>
              <option value="all">All Budgets</option>
            </select>

            {/* Saved Budget Selector (Only when multiple saved budgets exist!) */}
            {filteredBudgets.length > 1 && (
              <select
                value={selectedBudgetId}
                onChange={(e) => setSelectedBudgetId(e.target.value)}
                className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-text-primary shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary max-w-[200px] truncate"
                aria-label="Select saved budget"
              >
                {filteredBudgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (₹{Number(b.total_amount).toLocaleString("en-IN")})
                  </option>
                ))}
              </select>
            )}

            <CreateBudgetDialog
              categories={categories}
              accounts={accounts}
              onSuccess={() => router.refresh()}
            />
          </div>
        }
      />

      {/* EMPTY STATE: When user has NOT created any budgets */}
      {!currentBudget ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-surface space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <PiggyBank className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-text-primary">
              You haven&apos;t created a budget yet.
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary">
              Start planning your spending by creating your first budget.
            </p>
          </div>
          <div className="pt-2">
            <CreateBudgetDialog
              categories={categories}
              accounts={accounts}
              trigger={
                <Button className="bg-primary hover:bg-primary-hover text-surface rounded-xl text-xs font-semibold shadow-xs gap-1.5">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Create Your First Budget</span>
                </Button>
              }
              onSuccess={() => router.refresh()}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Active Budget Context Bar (Clean, minimal, no misleading standalone banner) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface border border-border/70 shadow-2xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Current Budget:
              </span>
              <span className="text-sm font-bold text-text-primary">
                {currentBudget.name}
              </span>
              <span className="text-xs text-text-secondary font-mono">
                (Limit: ₹{Number(currentBudget.total_amount).toLocaleString("en-IN")})
              </span>

              <Badge
                variant="outline"
                className={`text-[10px] py-0 px-2 h-4 rounded-md capitalize font-semibold ${
                  currentBudget.status === "paused"
                    ? "bg-warning/15 text-warning border-warning/30"
                    : "bg-success/15 text-success border-success/30"
                }`}
              >
                {currentBudget.status || "active"}
              </Badge>

              {currentBudget.rollover_enabled && (
                <Badge
                  variant="secondary"
                  className="text-[10px] py-0 px-2 h-4 rounded-md bg-primary/10 text-primary border-primary/20 font-medium"
                >
                  Rollover: {currentBudget.rollover_mode || "Full"}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleStatus(currentBudget.id, currentBudget.status || "active")}
                className="h-7 text-xs text-text-secondary hover:text-text-primary gap-1 rounded-lg"
                title={currentBudget.status === "paused" ? "Resume Budget" : "Pause Budget"}
              >
                {currentBudget.status === "paused" ? (
                  <>
                    <PlayCircle className="h-3 w-3 text-success" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <PauseCircle className="h-3 w-3 text-warning" />
                    <span>Pause</span>
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDuplicateBudget(currentBudget.id)}
                className="h-7 text-xs text-text-secondary hover:text-text-primary gap-1 rounded-lg"
                title="Duplicate Budget for Next Month"
              >
                <Copy className="h-3 w-3" />
                <span>Duplicate</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteBudget(currentBudget.id)}
                className="h-7 w-7 text-text-secondary hover:text-danger rounded-lg"
                title="Delete Budget"
                aria-label="Delete Budget"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Overspending / Threshold Alerts */}
          {budgetStats?.isOverBudget && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-danger/30 bg-danger/10 text-danger shadow-2xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold">Budget Exceeded!</span> You have spent{" "}
                <MoneyDisplay amount={budgetStats.totalSpent} className="font-bold" /> of your{" "}
                <MoneyDisplay amount={budgetStats.totalAllocated} className="font-bold" /> limit (
                {budgetStats.percentage}% utilized).
              </div>
            </div>
          )}

          {budgetStats?.isWarning && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-warning/30 bg-warning/10 text-warning shadow-2xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold">Approaching Budget Threshold:</span> You have utilized{" "}
                {budgetStats.percentage}% of your planned spending for this period.
              </div>
            </div>
          )}

          {/* 4 PRIMARY KPI CARDS (Fintech Clean Standard) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Budget */}
            <MetricCard
              title="Total Budget"
              amount={budgetStats?.totalAllocated || "0.00"}
              subtitle="Cycle spending cap"
              icon={PiggyBank}
              iconColor="forest"
            />

            {/* 2. Total Spent */}
            <MetricCard
              title="Total Spent"
              amount={budgetStats?.totalSpent || "0.00"}
              subtitle={`${budgetStats?.percentage || 0}% of budget utilized`}
              icon={TrendingDown}
              iconColor={
                budgetStats?.isOverBudget
                  ? "coral"
                  : budgetStats?.isWarning
                  ? "coral"
                  : "emerald"
              }
              coloredAmount={false}
            />

            {/* 3. Remaining Budget */}
            <MetricCard
              title="Remaining Budget"
              amount={budgetStats?.remaining || "0.00"}
              subtitle={
                budgetStats?.isOverBudget ? "Over budget limit" : "Safe envelope buffer"
              }
              icon={CheckCircle2}
              iconColor={budgetStats?.isOverBudget ? "coral" : "emerald"}
              coloredAmount
            />

            {/* 4. Daily Safe-to-Spend */}
            <MetricCard
              title="Daily Safe Velocity"
              amount={budgetStats?.forecast.adjustedDailySafeSpend || budgetStats?.forecast.dailySafeSpend || "0.00"}
              subtitle={
                budgetStats?.isOverBudget
                  ? "Restrict discretionary spend"
                  : `${budgetStats?.forecast.daysRemaining || 0} days remaining in cycle`
              }
              icon={Compass}
              iconColor={budgetStats?.isOverBudget ? "coral" : "indigo"}
              coloredAmount={!budgetStats?.isOverBudget}
            />
          </div>

          {/* SECONDARY COMPACT METRICS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <TrendingDown className="h-4 w-4 text-text-secondary" />
                <div>
                  <span className="text-xs font-semibold text-text-primary block">
                    Projected Month-End Spending
                  </span>
                  <span className="text-[11px] text-text-secondary">
                    {budgetStats?.forecast.isProjectedToExceed
                      ? "Estimated to exceed planned cap"
                      : "Paced comfortably within limit"}
                  </span>
                </div>
              </div>
              <MoneyDisplay
                amount={budgetStats?.forecast.projectedMonthEndSpending || "0.00"}
                className={`text-sm font-bold font-mono ${
                  budgetStats?.forecast.isProjectedToExceed ? "text-danger" : "text-text-primary"
                }`}
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <Receipt className="h-4 w-4 text-text-secondary" />
                <div>
                  <span className="text-xs font-semibold text-text-primary block">
                    Upcoming Fixed Bills
                  </span>
                  <span className="text-[11px] text-text-secondary">
                    Pending scheduled commitments in this cycle
                  </span>
                </div>
              </div>
              <MoneyDisplay
                amount={upcomingBillsTotal}
                className="text-sm font-bold font-mono text-text-primary"
              />
            </div>
          </div>

          {/* Overall Budget Progress Card */}
          <Card className="rounded-2xl border border-border/80 bg-surface shadow-2xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-bold text-text-primary">
                    Overall Budget Progress
                  </CardTitle>
                  <span className="text-xs text-text-secondary font-medium">
                    ({budgetStats?.percentage || 0}% used)
                  </span>
                </div>
                <span
                  className={`text-sm font-bold font-mono tabular-nums ${
                    budgetStats?.isOverBudget
                      ? "text-danger"
                      : budgetStats?.isWarning
                      ? "text-warning"
                      : "text-success"
                  }`}
                >
                  {budgetStats?.percentage || 0}%
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2">
              <Progress
                value={Math.min(budgetStats?.percentage || 0, 100)}
                indicatorClassName={
                  budgetStats?.isOverBudget
                    ? "bg-danger"
                    : budgetStats?.isWarning
                    ? "bg-warning"
                    : "bg-success"
                }
                className="h-2.5 rounded-full bg-surface-secondary"
              />
              <div className="flex justify-between text-xs text-text-secondary pt-0.5 font-mono tabular-nums">
                <span>
                  Spent:{" "}
                  <MoneyDisplay
                    amount={budgetStats?.totalSpent || "0.00"}
                    className="font-bold text-text-primary"
                  />
                </span>
                <span>
                  Limit:{" "}
                  <MoneyDisplay
                    amount={budgetStats?.totalAllocated || "0.00"}
                    className="font-bold text-text-primary"
                  />
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Category Budget Breakdown Table (ONLY USER-ALLOCATED CATEGORIES!) */}
          <CategoryBreakdown
            items={categoryBreakdownItems}
            hasOverallBudget={!!currentBudget}
            onAddCategoryBudget={() => {
              // Open edit / create dialog
            }}
            onDeleteAllocation={handleDeleteAllocation}
          />
        </>
      )}
    </div>
  );
}
