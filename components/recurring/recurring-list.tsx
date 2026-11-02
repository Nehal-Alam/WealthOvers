"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  Trash2,
  CheckCircle,
  PauseCircle,
  Landmark,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Target,
  PieChart as PieIcon,
  Repeat,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";
import dynamic from "next/dynamic";

const CreateRecurringDialog = dynamic(
  () =>
    import("@/components/recurring/create-recurring-dialog").then(
      (m) => m.CreateRecurringDialog
    ),
  { ssr: false }
);

import {
  toggleRecurringActiveAction,
  deleteRecurringAction,
} from "@/app/(dashboard)/recurring/actions";
import {
  addMoney,
  multiplyMoney,
  calculateCashFlowForecast,
} from "@/lib/calculations/financial";

interface RecurringWithRelations extends Tables<"recurring_transactions"> {
  account?: Tables<"accounts">;
  category?: Tables<"categories">;
}

interface RecurringListProps {
  recurringRules: RecurringWithRelations[];
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
}

export function RecurringList({
  recurringRules,
  accounts,
  categories,
}: RecurringListProps) {
  const [optimisticOverrides, setOptimisticOverrides] = React.useState<Record<string, boolean>>({});

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    // Optimistic immediate update
    setOptimisticOverrides((prev) => ({ ...prev, [id]: nextStatus }));

    const res = await toggleRecurringActiveAction(id, nextStatus);
    if (res.success) {
      toast.success(res.message);
    } else {
      // Reversible safe rollback
      setOptimisticOverrides((prev) => ({ ...prev, [id]: currentStatus }));
      toast.error(res.error || "Failed to toggle status");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete recurring rule for "${name}"?`)) return;
    const res = await deleteRecurringAction(id);
    if (res.success) {
      toast.success(res.message || "Rule deleted");
    } else {
      toast.error(res.error || "Failed to delete rule");
    }
  };

  // Calculate monthly impact for active rules
  const { monthlyExpenses, monthlyIncome, activeCount } = React.useMemo(() => {
    let exp = "0.0000";
    let inc = "0.0000";
    let count = 0;

    for (const rule of recurringRules) {
      const isActive =
        optimisticOverrides[rule.id] !== undefined
          ? optimisticOverrides[rule.id]
          : rule.is_active;

      if (!isActive) continue;
      count++;

      // Annualized multiplier normalized to monthly
      let monthlyMultiplier = 1;
      switch (rule.recurrence_interval) {
        case "daily":
          monthlyMultiplier = 30;
          break;
        case "weekly":
          monthlyMultiplier = 4.33;
          break;
        case "biweekly":
          monthlyMultiplier = 2.16;
          break;
        case "monthly":
          monthlyMultiplier = 1;
          break;
        case "quarterly":
          monthlyMultiplier = 1 / 3;
          break;
        case "yearly":
          monthlyMultiplier = 1 / 12;
          break;
      }

      const monthlyAmt = multiplyMoney(rule.amount, monthlyMultiplier);
      if (rule.transaction_type === "income") {
        inc = addMoney(inc, monthlyAmt);
      } else {
        exp = addMoney(exp, monthlyAmt);
      }
    }

    return {
      monthlyExpenses: exp,
      monthlyIncome: inc,
      activeCount: count,
    };
  }, [recurringRules, optimisticOverrides]);

  // Forward Cash Flow Forecast for 30, 60, and 90-day horizons
  const cashFlowForecast = React.useMemo(() => {
    const activeRules = recurringRules
      .filter((r) =>
        optimisticOverrides[r.id] !== undefined
          ? optimisticOverrides[r.id]
          : r.is_active
      )
      .map((r) => ({
        id: r.id,
        amount: r.amount,
        recurrence_interval: r.recurrence_interval,
        transaction_type: r.transaction_type,
        is_active: true,
      }));

    return calculateCashFlowForecast(activeRules, [30, 60, 90]);
  }, [recurringRules, optimisticOverrides]);

  return (
    <div className="space-y-6">
      {/* Top Header & Section 8 Unified Planning Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Planning & Commitments Hub
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your monthly budgets, recurring commitments, and savings goals in one place.
          </p>
        </div>

        <CreateRecurringDialog accounts={accounts} categories={categories} />
      </div>

      {/* Unified Plan Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-secondary/70 rounded-xl border border-border/70 w-fit">
        <Link
          href="/budgets"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary transition-all"
        >
          <PieIcon className="h-3.5 w-3.5" />
          <span>Monthly Budgets</span>
        </Link>
        <Link
          href="/goals"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary transition-all"
        >
          <Target className="h-3.5 w-3.5" />
          <span>Financial Goals</span>
        </Link>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-surface shadow-2xs">
          <Repeat className="h-3.5 w-3.5" />
          <span>Recurring & Bills</span>
        </div>
      </div>

      {/* KPI Cards using Leftovers palette */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Monthly Recurring Commitments"
          amount={monthlyExpenses}
          subtitle="Fixed recurring expenses"
          icon={TrendingDown}
          iconColor="#C77A65"
          coloredAmount={false}
        />
        <MetricCard
          title="Monthly Inflow"
          amount={monthlyIncome}
          subtitle="Recurring income streams"
          icon={TrendingUp}
          iconColor="#39805B"
          coloredAmount
        />
        <MetricCard
          title="Active Rules"
          amount={activeCount}
          formatType="count"
          subtitle={`${recurringRules.length - activeCount} rules paused`}
          icon={Clock}
          iconColor="#244B3C"
        />
      </div>

      {/* Forward Cash-Flow Projection Card */}
      {activeCount > 0 && (
        <Card className="border border-border/80 shadow-xs overflow-hidden bg-card rounded-2xl">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold text-foreground">
                  Forward Recurring Cash-Flow Outlook
                </CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">
                Based on active scheduled debits and income
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
              {cashFlowForecast.map((period, idx) => (
                <div key={period.days} className={`${idx > 0 ? "pt-3 sm:pt-0 sm:pl-4" : ""}`}>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {period.label} Horizon
                  </div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Net Impact:</span>
                    <MoneyDisplay
                      amount={period.netCashFlow}
                      positiveSign
                      colored
                      className="font-mono font-bold text-base"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="text-success font-medium">
                      In: <MoneyDisplay amount={period.inflows} className="font-mono" />
                    </span>
                    <span className="text-danger font-medium">
                      Out: <MoneyDisplay amount={period.outflows} className="font-mono" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules List */}
      {recurringRules.length === 0 ? (
        /* Section 11 Onboarding Empty State */
        <div className="rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center bg-card">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
            <Calendar className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No recurring rules configured</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
            Add recurring bills, subscriptions, or salaries to forecast monthly cash flows.
          </p>
          <div className="mt-3 p-3 rounded-lg bg-surface-secondary/40 border border-border/60 max-w-sm mx-auto text-left text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Example: </span>
            Netflix subscription of ₹649 on 5th of every month, or monthly apartment rent.
          </div>
          <div className="pt-5 flex justify-center">
            <CreateRecurringDialog accounts={accounts} categories={categories} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recurringRules.map((rule) => {
            const isIncome = rule.transaction_type === "income";
            const isActive =
              optimisticOverrides[rule.id] !== undefined
                ? optimisticOverrides[rule.id]
                : rule.is_active;

            return (
              <Card
                key={rule.id}
                className={`overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs transition-all hover:border-primary/40 ${
                  !isActive ? "opacity-60 bg-surface-secondary/30" : ""
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-3">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                          isIncome
                            ? "bg-success/10 text-success"
                            : "bg-danger/10 text-danger"
                        }`}
                      >
                        {isIncome ? (
                          <TrendingUp className="h-5 w-5" />
                        ) : (
                          <TrendingDown className="h-5 w-5" />
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-base leading-tight text-foreground">
                          {rule.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                          <Landmark className="h-3 w-3" />
                          <span>{rule.account?.name || "Account"}</span>
                          {rule.category && (
                            <>
                              <span>•</span>
                              <span>{rule.category.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <MoneyDisplay
                        amount={rule.amount}
                        currency={rule.currency}
                        positiveSign={isIncome}
                        colored
                        className="font-bold text-base font-mono"
                      />
                      <Badge variant="outline" className="text-[10px] mt-1 capitalize border-border/80">
                        {rule.recurrence_interval}
                      </Badge>
                    </div>
                  </div>

                  {/* Footer with Next Due & Active Toggle */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        Next:{" "}
                        <strong className="text-foreground">
                          {format(new Date(rule.next_occurrence_date), "dd MMM yyyy")}
                        </strong>
                      </span>
                      {isActive && (() => {
                        const days = differenceInDays(new Date(rule.next_occurrence_date), new Date());
                        if (days <= 0) {
                          return (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 gap-1 animate-pulse bg-danger/10 text-danger border-danger/30 font-semibold">
                              <AlertCircle className="h-2.5 w-2.5" /> Due Today
                            </Badge>
                          );
                        }
                        if (days <= 3) {
                          return (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-danger/30 text-danger bg-danger/10 font-medium">
                              Due in {days}d
                            </Badge>
                          );
                        }
                        if (days <= 7) {
                          return (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-warning/30 text-warning bg-warning/10 font-medium">
                              Due in {days}d
                            </Badge>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={isActive}
                        onCheckedChange={() =>
                          handleToggleActive(rule.id, isActive)
                        }
                        aria-label="Toggle active status"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-danger hover:bg-danger/10"
                        onClick={() => handleDelete(rule.id, rule.name)}
                        aria-label="Delete rule"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
