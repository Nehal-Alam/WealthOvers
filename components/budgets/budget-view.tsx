"use client";

import * as React from "react";
import {
  PiggyBank,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Calendar,
  Layers,
  TrendingDown,
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
import { CreateBudgetDialog } from "@/components/budgets/create-budget-dialog";
import { deleteBudgetAction } from "@/app/(dashboard)/budgets/actions";
import { calculateBudgetUtilization } from "@/lib/calculations/financial";

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
            <h2 className="text-xl font-bold tracking-tight">Budgets & Limits</h2>
            <p className="text-sm text-muted-foreground">
              Define spending limits and track category-level utilization.
            </p>
          </div>
          <CreateBudgetDialog categories={categories} />
        </div>

        <div className="rounded-xl border border-dashed p-12 text-center bg-card">
          <PiggyBank className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold">No active budgets</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Set up a monthly budget to prevent overspending and track goals.
          </p>
          <CreateBudgetDialog categories={categories} />
        </div>
      </div>
    );
  }

  // Calculate overall utilization
  const totalAllocated = currentBudget.total_amount;
  const totalSpent = currentBudget.totalSpent || "0.0000";
  const { remaining, percentage, isOverBudget } = calculateBudgetUtilization(
    totalAllocated,
    totalSpent
  );

  const isWarning =
    percentage >= currentBudget.alert_threshold_percent && !isOverBudget;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{currentBudget.name}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {format(new Date(currentBudget.start_date), "dd MMM yyyy")} –{" "}
              {format(new Date(currentBudget.end_date), "dd MMM yyyy")}
            </span>
            {currentBudget.rollover_enabled && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                Rollover Active
              </Badge>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {budgets.length > 1 && (
            <select
              value={selectedBudgetId}
              onChange={(e) => setSelectedBudgetId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            onClick={() => handleDeleteBudget(currentBudget.id)}
            aria-label="Delete budget"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overspending Alert Banner */}
      {isOverBudget && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Budget Exceeded!</span> You have spent{" "}
            <MoneyDisplay amount={totalSpent} className="font-bold" /> of your{" "}
            <MoneyDisplay amount={totalAllocated} className="font-bold" /> limit (
            {percentage}% utilized).
          </div>
        </div>
      )}

      {isWarning && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Budget Alert Threshold Reached:</span>{" "}
            You have used {percentage}% of your planned spending for this period.
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Budget"
          amount={totalAllocated}
          subtitle="Monthly planned spending cap"
          icon={PiggyBank}
          iconColor="#3B82F6"
        />
        <MetricCard
          title="Total Spent"
          amount={totalSpent}
          subtitle={`${percentage}% of budget utilized`}
          icon={TrendingDown}
          iconColor={isOverBudget ? "#EF4444" : isWarning ? "#F59E0B" : "#10B981"}
          coloredAmount={false}
        />
        <MetricCard
          title="Remaining Budget"
          amount={remaining}
          subtitle={isOverBudget ? "Over budget" : "Safe to spend"}
          icon={CheckCircle2}
          iconColor={isOverBudget ? "#EF4444" : "#10B981"}
          coloredAmount
        />
      </div>

      {/* Main Budget Progress Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Overall Budget Progress
            </CardTitle>
            <span
              className={`text-sm font-bold font-mono ${
                isOverBudget
                  ? "text-rose-600"
                  : isWarning
                  ? "text-amber-600"
                  : "text-emerald-600"
              }`}
            >
              {percentage}%
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress
            value={Math.min(percentage, 100)}
            indicatorClassName={
              isOverBudget
                ? "bg-rose-500"
                : isWarning
                ? "bg-amber-500"
                : "bg-emerald-500"
            }
            className="h-3"
          />
          <div className="flex justify-between text-xs text-muted-foreground pt-1">
            <span>Spent: <MoneyDisplay amount={totalSpent} /></span>
            <span>Limit: <MoneyDisplay amount={totalAllocated} /></span>
          </div>
        </CardContent>
      </Card>

      {/* Category Allocations Breakdown */}
      {currentBudget.budget_categories &&
        currentBudget.budget_categories.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Category Allocations ({currentBudget.budget_categories.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentBudget.budget_categories.map((alloc) => {
                const spent = currentBudget.spentByCategory?.[alloc.category_id] || "0.0000";
                const util = calculateBudgetUtilization(alloc.allocated_amount, spent);

                return (
                  <Card key={alloc.id} className="p-4 shadow-sm border">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2.5">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{
                            backgroundColor: alloc.category?.color || "#6B7280",
                          }}
                        />
                        <span className="font-semibold text-sm">
                          {alloc.category?.name || "Category"}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold ${
                          util.isOverBudget
                            ? "text-rose-600"
                            : util.percentage >= currentBudget.alert_threshold_percent
                            ? "text-amber-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {util.percentage}%
                      </span>
                    </div>

                    <Progress
                      value={Math.min(util.percentage, 100)}
                      indicatorClassName={
                        util.isOverBudget
                          ? "bg-rose-500"
                          : util.percentage >= currentBudget.alert_threshold_percent
                          ? "bg-amber-500"
                          : "bg-primary"
                      }
                      className="h-2 my-2"
                    />

                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                      <span>Spent: <MoneyDisplay amount={spent} /></span>
                      <span>Limit: <MoneyDisplay amount={alloc.allocated_amount} /></span>
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
