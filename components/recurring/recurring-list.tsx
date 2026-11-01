"use client";

import * as React from "react";
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
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";
import { CreateRecurringDialog } from "@/components/recurring/create-recurring-dialog";
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
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const res = await toggleRecurringActiveAction(id, !currentStatus);
    if (res.success) {
      toast.success(res.message);
    } else {
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
      if (!rule.is_active) continue;
      count++;

      // Normalize frequency to monthly estimate
      let multiplier = "1";
      switch (rule.recurrence_interval) {
        case "daily":
          multiplier = "30";
          break;
        case "weekly":
          multiplier = "4.33";
          break;
        case "biweekly":
          multiplier = "2.16";
          break;
        case "monthly":
          multiplier = "1";
          break;
        case "quarterly":
          multiplier = "0.333";
          break;
        case "half_yearly":
          multiplier = "0.166";
          break;
        case "yearly":
          multiplier = "0.0833";
          break;
      }

      const monthlyVal = multiplyMoney(rule.amount, multiplier);
      if (rule.transaction_type === "income") {
        inc = addMoney(inc, monthlyVal);
      } else {
        exp = addMoney(exp, monthlyVal);
      }
    }

    return { monthlyExpenses: exp, monthlyIncome: inc, activeCount: count };
  }, [recurringRules]);

  // Forward Cash Flow Projections (30, 60, 90 Days)
  const cashFlowForecast = React.useMemo(() => {
    return calculateCashFlowForecast(recurringRules, [30, 60, 90]);
  }, [recurringRules]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Recurring Bills & Subscriptions</h2>
          <p className="text-sm text-muted-foreground">
            Track scheduled payments, automated debits, and monthly subscription commitments.
          </p>
        </div>
        <CreateRecurringDialog accounts={accounts} categories={categories} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Est. Monthly Outflow"
          amount={monthlyExpenses}
          subtitle="Fixed recurring expenses"
          icon={TrendingDown}
          iconColor="#EF4444"
          coloredAmount={false}
        />
        <MetricCard
          title="Est. Monthly Inflow"
          amount={monthlyIncome}
          subtitle="Recurring income streams"
          icon={TrendingUp}
          iconColor="#10B981"
          coloredAmount
        />
        <MetricCard
          title="Active Rules"
          amount={activeCount}
          subtitle={`${recurringRules.length - activeCount} rules paused`}
          icon={Clock}
          iconColor="#3B82F6"
        />
      </div>

      {/* Forward Cash-Flow Projection Card */}
      {activeCount > 0 && (
        <Card className="border shadow-sm overflow-hidden bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  Forward Recurring Cash-Flow Outlook
                </CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">
                Based on active scheduled debits and income
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
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
                    <span className="text-emerald-600 dark:text-emerald-400">
                      In: <MoneyDisplay amount={period.inflows} />
                    </span>
                    <span className="text-rose-600 dark:text-rose-400">
                      Out: <MoneyDisplay amount={period.outflows} />
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
        <div className="rounded-xl border border-dashed p-12 text-center bg-card">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold">No recurring rules configured</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add recurring bills, subscriptions, or salaries to forecast monthly cash flows.
          </p>
          <CreateRecurringDialog accounts={accounts} categories={categories} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recurringRules.map((rule) => {
            const isIncome = rule.transaction_type === "income";

            return (
              <Card
                key={rule.id}
                className={`overflow-hidden border transition-all hover:shadow-md ${
                  !rule.is_active ? "opacity-60 bg-muted/30" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-3">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                          isIncome
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        {isIncome ? (
                          <TrendingUp className="h-5 w-5" />
                        ) : (
                          <TrendingDown className="h-5 w-5" />
                        )}
                      </div>

                      <div>
                        <h4 className="font-semibold text-base leading-tight">
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
                        className="font-bold text-base"
                      />
                      <Badge variant="outline" className="text-[10px] mt-1 capitalize">
                        {rule.recurrence_interval}
                      </Badge>
                    </div>
                  </div>

                  {/* Footer with Next Due & Active Toggle */}
                  <div className="mt-4 pt-3 border-t flex items-center justify-between">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        Next:{" "}
                        <strong className="text-foreground">
                          {format(new Date(rule.next_occurrence_date), "dd MMM yyyy")}
                        </strong>
                      </span>
                      {rule.is_active && (() => {
                        const days = differenceInDays(new Date(rule.next_occurrence_date), new Date());
                        if (days <= 0) {
                          return (
                            <Badge variant="destructive" className="text-[10px] py-0 px-1.5 h-4 gap-1 animate-pulse">
                              <AlertCircle className="h-2.5 w-2.5" /> Due Today
                            </Badge>
                          );
                        }
                        if (days <= 3) {
                          return (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-rose-500/30 text-rose-500 bg-rose-500/10">
                              Due in {days}d
                            </Badge>
                          );
                        }
                        if (days <= 7) {
                          return (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-amber-500/30 text-amber-500 bg-amber-500/10">
                              Due in {days}d
                            </Badge>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() =>
                          handleToggleActive(rule.id, rule.is_active)
                        }
                        aria-label="Toggle active status"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
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

