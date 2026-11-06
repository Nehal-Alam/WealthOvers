"use client";

import * as React from "react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import {
  Receipt,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Layers,
  Sparkles,
  ArrowRight,
  Plus,
  SkipForward,
  PauseCircle,
  PlayCircle,
  Trash2,
  Filter,
} from "lucide-react";

import { Tables } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";
import { PlanHeader } from "@/components/plan/plan-header";
import { MarkBillPaidDialog } from "./mark-bill-paid-dialog";
import { CreateRecurringDialog } from "./create-recurring-dialog";

import {
  skipBillOccurrenceAction,
  toggleRecurringActiveAction,
  deleteRecurringAction,
} from "@/app/(dashboard)/recurring/actions";
import { addMoney, multiplyMoney } from "@/lib/calculations/financial";

interface BillOccurrenceItem extends Tables<"bill_occurrences"> {
  recurring?: Tables<"recurring_transactions"> & {
    account?: Tables<"accounts">;
    category?: Tables<"categories">;
  };
}

interface BillsDashboardProps {
  recurringRules: any[];
  occurrences: BillOccurrenceItem[];
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
}

type BillFilter = "active" | "upcoming" | "due" | "overdue" | "paid" | "paused" | "all";

export function BillsDashboard({
  recurringRules,
  occurrences,
  accounts,
  categories,
}: BillsDashboardProps) {
  const [filter, setFilter] = React.useState<BillFilter>("active");
  const [payTargetBill, setPayTargetBill] = React.useState<any | null>(null);
  const [payTargetOccurrence, setPayTargetOccurrence] =
    React.useState<Tables<"bill_occurrences"> | null>(null);

  // Compute Bills KPIs from user-created saved records
  const { monthlyExpenses, upcomingTotal, dueTodayCount, overdueCount } =
    React.useMemo(() => {
      let exp = "0.0000";
      let up = "0.0000";
      let dueToday = 0;
      let overdue = 0;
      const today = new Date();

      // Monthly commitments from active rules
      for (const rule of recurringRules) {
        if (!rule.is_active || rule.transaction_type === "income") continue;

        let multiplier = 1;
        switch (rule.recurrence_interval) {
          case "daily": multiplier = 30; break;
          case "weekly": multiplier = 4.33; break;
          case "biweekly": multiplier = 2.16; break;
          case "monthly": multiplier = 1; break;
          case "quarterly": multiplier = 1 / 3; break;
          case "yearly": multiplier = 1 / 12; break;
        }
        exp = addMoney(exp, multiplyMoney(rule.amount, multiplier));
      }

      // Occurrences stats
      for (const occ of occurrences) {
        if (occ.status === "upcoming" || occ.status === "due" || occ.status === "overdue") {
          up = addMoney(up, occ.amount);
          const days = differenceInDays(new Date(occ.due_date), today);
          if (days === 0) dueToday++;
          else if (days < 0 || occ.status === "overdue") overdue++;
        }
      }

      // If occurrences table is empty, compute from recurring rules next occurrence dates
      if (occurrences.length === 0) {
        for (const rule of recurringRules) {
          if (!rule.is_active || rule.transaction_type === "income") continue;
          up = addMoney(up, rule.amount);
          const days = differenceInDays(new Date(rule.next_occurrence_date), today);
          if (days === 0) dueToday++;
          else if (days < 0) overdue++;
        }
      }

      return {
        monthlyExpenses: exp,
        upcomingTotal: up,
        dueTodayCount: dueToday,
        overdueCount: overdue,
      };
    }, [recurringRules, occurrences]);

  const handlePayClick = (rule: any, occurrence?: Tables<"bill_occurrences">) => {
    setPayTargetBill(rule);
    setPayTargetOccurrence(occurrence || null);
  };

  const handleSkipOccurrence = async (occ: BillOccurrenceItem) => {
    if (!confirm("Skip this scheduled bill occurrence?")) return;
    const res = await skipBillOccurrenceAction({
      occurrence_id: occ.id,
      recurring_id: occ.recurring_id,
    });
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.error || "Failed to skip bill");
    }
  };

  const handleToggleRule = async (id: string, currentActive: boolean) => {
    const res = await toggleRecurringActiveAction(id, !currentActive);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.error || "Failed to toggle status");
    }
  };

  const handleDeleteRule = async (id: string, name: string) => {
    if (!confirm(`Delete recurring bill schedule for "${name}"?`)) return;
    const res = await deleteRecurringAction(id);
    if (res.success) {
      toast.success(res.message || "Rule deleted");
    } else {
      toast.error(res.error || "Failed to delete rule");
    }
  };

  // Filtered recurring rules
  const filteredRules = React.useMemo(() => {
    return recurringRules.filter((r) => {
      if (filter === "all") return true;
      if (filter === "active") return r.is_active;
      if (filter === "paused") return !r.is_active;
      const days = differenceInDays(new Date(r.next_occurrence_date), new Date());
      if (filter === "due") return days === 0;
      if (filter === "overdue") return days < 0;
      if (filter === "upcoming") return days > 0;
      return true;
    });
  }, [recurringRules, filter]);

  return (
    <div className="space-y-6">
      {/* SINGLE Primary Plan Header (No Duplicate Tab Bar!) */}
      <PlanHeader
        activeTab="recurring"
        title="Recurring & Bills"
        description="Track rent, utilities, subscriptions, EMIs, and scheduled commitments."
        actions={
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(val: any) => setFilter(val)}>
              <SelectTrigger className="h-8 text-xs bg-surface border-border w-32">
                <Filter className="h-3 w-3 text-text-secondary mr-1 shrink-0" />
                <SelectValue placeholder="All Active" />
              </SelectTrigger>
              <SelectContent className="bg-surface text-text-primary border-border">
                <SelectItem value="active" className="text-xs">All Active</SelectItem>
                <SelectItem value="upcoming" className="text-xs">Upcoming</SelectItem>
                <SelectItem value="due" className="text-xs">Due Today</SelectItem>
                <SelectItem value="overdue" className="text-xs">Overdue</SelectItem>
                <SelectItem value="paused" className="text-xs">Paused</SelectItem>
                <SelectItem value="all" className="text-xs">All Schedules</SelectItem>
              </SelectContent>
            </Select>

            <CreateRecurringDialog
              accounts={accounts}
              categories={categories}
              trigger={
                <Button className="gap-1.5 h-8 bg-primary hover:bg-primary-hover text-surface rounded-xl text-xs font-semibold shadow-xs">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Bill</span>
                </Button>
              }
            />
          </div>
        }
      />

      {/* 4 SUMMARY METRIC CARDS REQUIRED BY SPEC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Monthly Recurring Commitments */}
        <MetricCard
          title="Monthly Recurring Commitments"
          amount={monthlyExpenses}
          subtitle="Fixed recurring expenses"
          icon={TrendingDown}
          iconColor="coral"
          coloredAmount={false}
        />

        {/* 2. Upcoming Payments */}
        <MetricCard
          title="Upcoming Payments"
          amount={upcomingTotal}
          subtitle="Pending in current cycle"
          icon={Receipt}
          iconColor="forest"
          coloredAmount={false}
        />

        {/* 3. Due Today */}
        <MetricCard
          title="Due Today"
          amount={dueTodayCount}
          formatType="count"
          subtitle={dueTodayCount > 0 ? "Payment due today" : "No bills due today"}
          icon={Clock}
          iconColor={dueTodayCount > 0 ? "coral" : "indigo"}
        />

        {/* 4. Overdue Payments */}
        <MetricCard
          title="Overdue Payments"
          amount={overdueCount}
          formatType="count"
          subtitle={overdueCount > 0 ? "Requires immediate clearance" : "All payments on track"}
          icon={AlertCircle}
          iconColor={overdueCount > 0 ? "coral" : "emerald"}
        />
      </div>

      {/* BILLS LIST / EMPTY STATE */}
      {recurringRules.length === 0 ? (
        /* EXACT EMPTY STATE REQUIRED BY SPEC */
        <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-surface space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Receipt className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-text-primary">
              No recurring bills added yet.
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary">
              Track rent, utilities, subscriptions, EMIs, and other recurring payments.
            </p>
          </div>
          <div className="pt-2">
            <CreateRecurringDialog
              accounts={accounts}
              categories={categories}
              trigger={
                <Button className="bg-primary hover:bg-primary-hover text-surface rounded-xl text-xs font-semibold shadow-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Your First Bill</span>
                </Button>
              }
            />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/80 bg-surface shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-secondary/60 border-b border-border/70 text-[11px] font-semibold text-text-secondary uppercase tracking-wider select-none">
                <tr>
                  <th className="py-3 px-4">Bill Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3">Frequency</th>
                  <th className="py-3 px-3">Next Due Date</th>
                  <th className="py-3 px-3">Account</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRules.map((rule) => {
                  const days = differenceInDays(new Date(rule.next_occurrence_date), new Date());
                  const isDueToday = days === 0;
                  const isOverdue = days < 0;

                  return (
                    <tr
                      key={rule.id}
                      className="hover:bg-surface-secondary/40 transition-colors"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4 font-semibold text-text-primary">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{rule.name}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 text-text-secondary">
                        {rule.category?.name || "General"}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-3 text-right font-bold text-text-primary font-mono tabular-nums">
                        <MoneyDisplay amount={rule.amount} />
                      </td>

                      {/* Frequency */}
                      <td className="py-3.5 px-3 capitalize text-text-secondary">
                        {rule.recurrence_interval}
                      </td>

                      {/* Next Due Date */}
                      <td className="py-3.5 px-3 font-mono text-text-secondary">
                        <span className={isOverdue ? "text-danger font-semibold" : isDueToday ? "text-warning font-semibold" : ""}>
                          {format(new Date(rule.next_occurrence_date), "dd MMM yyyy")}
                        </span>
                      </td>

                      {/* Account */}
                      <td className="py-3.5 px-3 text-text-secondary">
                        {rule.account?.name || "Account"}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        {!rule.is_active ? (
                          <Badge variant="outline" className="text-[10px] py-0 px-2 h-4 text-text-secondary border-border">
                            Paused
                          </Badge>
                        ) : isDueToday ? (
                          <Badge className="text-[10px] py-0 px-2 h-4 bg-warning/15 text-warning border-warning/30 font-semibold animate-pulse">
                            Due Today
                          </Badge>
                        ) : isOverdue ? (
                          <Badge className="text-[10px] py-0 px-2 h-4 bg-danger/15 text-danger border-danger/30 font-semibold">
                            Overdue ({Math.abs(days)}d)
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] py-0 px-2 h-4 bg-success/15 text-success border-success/30 font-semibold">
                            Active
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {rule.is_active && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handlePayClick(rule)}
                              className="h-7 text-xs font-semibold bg-success hover:bg-success/90 text-surface rounded-lg gap-1 shadow-2xs"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Mark Paid</span>
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleRule(rule.id, rule.is_active)}
                            className="h-7 w-7 text-text-secondary hover:text-text-primary rounded-lg"
                            title={rule.is_active ? "Pause Rule" : "Resume Rule"}
                          >
                            {rule.is_active ? (
                              <PauseCircle className="h-3.5 w-3.5" />
                            ) : (
                              <PlayCircle className="h-3.5 w-3.5" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRule(rule.id, rule.name)}
                            className="h-7 w-7 text-text-secondary hover:text-danger rounded-lg"
                            title="Delete Schedule"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Mark Bill Paid Modal */}
      {payTargetBill && (
        <MarkBillPaidDialog
          recurring={payTargetBill}
          occurrence={payTargetOccurrence}
          accounts={accounts}
          open={!!payTargetBill}
          onOpenChange={(open) => {
            if (!open) {
              setPayTargetBill(null);
              setPayTargetOccurrence(null);
            }
          }}
        />
      )}
    </div>
  );
}
