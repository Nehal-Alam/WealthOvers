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
} from "lucide-react";

import { Tables } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";
import { PlanHeader } from "@/components/plan/plan-header";
import { MarkBillPaidDialog } from "./mark-bill-paid-dialog";
import { CreateRecurringDialog } from "./create-recurring-dialog";
import { RecurringList } from "./recurring-list";
import { RecurringDetectorCard } from "./recurring-detector-card";

import {
  skipBillOccurrenceAction,
  toggleRecurringActiveAction,
} from "@/app/(dashboard)/recurring/actions";
import { addMoney, toDecimal } from "@/lib/calculations/financial";

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

export function BillsDashboard({
  recurringRules,
  occurrences,
  accounts,
  categories,
}: BillsDashboardProps) {
  const [subTab, setSubTab] = React.useState<"occurrences" | "rules">("occurrences");
  const [payTargetBill, setPayTargetBill] = React.useState<any | null>(null);
  const [payTargetOccurrence, setPayTargetOccurrence] =
    React.useState<Tables<"bill_occurrences"> | null>(null);

  // Compute Bills KPIs
  const { upcomingTotal, paidTotal, dueTodayCount, overdueCount } =
    React.useMemo(() => {
      let up = "0.0000";
      let pd = "0.0000";
      let dueToday = 0;
      let overdue = 0;
      const today = new Date();

      for (const occ of occurrences) {
        if (occ.status === "paid") {
          pd = addMoney(pd, occ.paid_amount || occ.amount);
        } else if (occ.status !== "skipped" && occ.status !== "cancelled") {
          up = addMoney(up, occ.amount);
          const days = differenceInDays(new Date(occ.due_date), today);
          if (days === 0) dueToday++;
          else if (days < 0 || occ.status === "overdue") overdue++;
        }
      }

      // If occurrences table is empty, compute from recurringRules
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
        upcomingTotal: up,
        paidTotal: pd,
        dueTodayCount: dueToday,
        overdueCount: overdue,
      };
    }, [occurrences, recurringRules]);

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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PlanHeader
        activeTab="recurring"
        actions={
          <CreateRecurringDialog accounts={accounts} categories={categories} />
        }
      />

      {/* Overview 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Upcoming Bills"
          amount={upcomingTotal}
          subtitle="Pending in current cycle"
          icon={Receipt}
          iconColor="forest"
          coloredAmount={false}
        />
        <MetricCard
          title="Paid This Cycle"
          amount={paidTotal}
          subtitle="Cleared bill commitments"
          icon={CheckCircle2}
          iconColor="emerald"
          coloredAmount
        />
        <MetricCard
          title="Due Today"
          amount={dueTodayCount}
          formatType="count"
          subtitle={dueTodayCount > 0 ? "Action required today" : "No bills due today"}
          icon={Clock}
          iconColor={dueTodayCount > 0 ? "coral" : "indigo"}
        />
        <MetricCard
          title="Active Subscriptions"
          amount={recurringRules.filter((r) => r.is_active).length}
          formatType="count"
          subtitle={`${recurringRules.length} total scheduled rules`}
          icon={Layers}
          iconColor="indigo"
        />
      </div>

      {/* Sub-view switcher: Bills Occurrences vs Recurring Rules */}
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-surface-secondary/70 rounded-xl border border-border/70">
          <button
            onClick={() => setSubTab("occurrences")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              subTab === "occurrences"
                ? "bg-surface text-primary shadow-2xs font-bold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Bill Due Dates & Payments
          </button>
          <button
            onClick={() => setSubTab("rules")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              subTab === "rules"
                ? "bg-surface text-primary shadow-2xs font-bold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Schedules & Subscriptions ({recurringRules.length})
          </button>
        </div>

        <span className="text-xs text-text-secondary hidden sm:inline">
          {subTab === "occurrences"
            ? `${occurrences.length} scheduled occurrences`
            : "Rule frequencies & auto-debit"}
        </span>
      </div>

      {subTab === "occurrences" ? (
        /* Occurrences Table */
        <div className="space-y-4">
          {occurrences.length === 0 ? (
            /* Fallback to list of upcoming recurring dates */
            <div className="rounded-2xl border border-border/80 bg-surface shadow-2xs overflow-hidden">
              <div className="p-4 bg-surface-secondary/40 border-b border-border/70">
                <h4 className="text-sm font-bold text-text-primary">
                  Upcoming Bill Due Dates
                </h4>
                <p className="text-xs text-text-secondary">
                  Generated from active recurring rules. Click &ldquo;Mark Paid&rdquo; to post directly to your ledger.
                </p>
              </div>

              <div className="divide-y divide-border/60">
                {recurringRules
                  .filter((r) => r.is_active && r.transaction_type !== "income")
                  .map((rule) => {
                    const days = differenceInDays(new Date(rule.next_occurrence_date), new Date());
                    const isOverdue = days < 0;
                    const isDueToday = days === 0;

                    return (
                      <div
                        key={rule.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                            <Receipt className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-text-primary truncate">
                                {rule.name}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1.5 h-4 capitalize border-border"
                              >
                                {rule.recurrence_interval}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3 text-primary" />
                              <span>Due: {format(new Date(rule.next_occurrence_date), "dd MMM yyyy")}</span>
                              {isDueToday && (
                                <span className="text-danger font-bold ml-1">• Due Today</span>
                              )}
                              {isOverdue && (
                                <span className="text-danger font-bold ml-1">• Overdue by {Math.abs(days)}d</span>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto">
                          <MoneyDisplay
                            amount={rule.amount}
                            className="text-sm font-bold font-mono text-text-primary"
                          />

                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePayClick(rule)}
                            className="h-8 text-xs font-semibold bg-success hover:bg-success/90 text-surface rounded-xl gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Mark Paid</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/80 bg-surface shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-secondary/60 border-b border-border/70 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Bill Name</th>
                      <th className="py-3 px-3">Due Date</th>
                      <th className="py-3 px-3 text-right">Amount</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {occurrences.map((occ) => {
                      const isPaid = occ.status === "paid";
                      const isSkipped = occ.status === "skipped";

                      return (
                        <tr
                          key={occ.id}
                          className="hover:bg-surface-secondary/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-semibold text-text-primary">
                            <div className="flex items-center gap-2">
                              <Receipt className="h-3.5 w-3.5 text-primary" />
                              <span>{occ.recurring?.name || "Scheduled Bill"}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-text-secondary font-mono">
                            {format(new Date(occ.due_date), "dd MMM yyyy")}
                          </td>

                          <td className="py-3 px-3 text-right font-bold text-text-primary font-mono tabular-nums">
                            <MoneyDisplay amount={occ.paid_amount || occ.amount} />
                          </td>

                          <td className="py-3 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] py-0 px-2 h-4 capitalize font-semibold ${
                                isPaid
                                  ? "bg-success/15 text-success border-success/30"
                                  : isSkipped
                                  ? "bg-surface-secondary text-text-secondary border-border"
                                  : occ.status === "overdue"
                                  ? "bg-danger/15 text-danger border-danger/30"
                                  : "bg-primary/10 text-primary border-primary/20"
                              }`}
                            >
                              {occ.status}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-right">
                            {!isPaid && !isSkipped && (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSkipOccurrence(occ)}
                                  className="h-7 text-xs text-text-secondary hover:text-text-primary rounded-lg"
                                  title="Skip Occurrence"
                                >
                                  <SkipForward className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePayClick(occ.recurring || occ, occ)}
                                  className="h-7 text-xs border-success/30 text-success hover:bg-success/10 rounded-lg gap-1"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Pay</span>
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Recurring Rules View */
        <div className="space-y-6">
          <RecurringDetectorCard accounts={accounts} />
          <RecurringList
            recurringRules={recurringRules}
            accounts={accounts}
            categories={categories}
          />
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
