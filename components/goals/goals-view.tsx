"use client";

import * as React from "react";
import Link from "next/link";
import {
  Target,
  PlusCircle,
  PiggyBank,
  Calendar,
  CheckCircle2,
  Trash2,
  TrendingUp,
  Sparkles,
  Layers,
  Calculator,
  Repeat,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";
import { ProgressRing } from "@/components/goals/progress-ring";
import { GoalCalculator } from "@/components/goals/goal-calculator";
import { PlanHeader } from "@/components/plan/plan-header";
import dynamic from "next/dynamic";

const CreateGoalDialog = dynamic(
  () =>
    import("@/components/goals/create-goal-dialog").then(
      (m) => m.CreateGoalDialog
    ),
  { ssr: false }
);

const ContributeGoalDialog = dynamic(
  () =>
    import("@/components/goals/contribute-goal-dialog").then(
      (m) => m.ContributeGoalDialog
    ),
  { ssr: false }
);

import { deleteGoalAction } from "@/app/(dashboard)/goals/actions";
import {
  addMoney,
  subtractMoney,
  calculateGoalMonthlyRequired,
  calculateGoalTrajectory,
  toDecimal,
} from "@/lib/calculations/financial";

interface GoalWithContributions extends Tables<"financial_goals"> {
  contributions?: Tables<"goal_contributions">[];
}

interface GoalsViewProps {
  goals: GoalWithContributions[];
  accounts?: Tables<"accounts">[];
}

export function GoalsView({ goals, accounts = [] }: GoalsViewProps) {
  const [contributeTargetGoal, setContributeTargetGoal] =
    React.useState<Tables<"financial_goals"> | null>(null);
  const [showCalculator, setShowCalculator] = React.useState<boolean>(false);

  // Aggregate Metrics
  const { totalTarget, totalCurrent, totalRemaining, overallProgress } =
    React.useMemo(() => {
      let tgt = "0.0000";
      let cur = "0.0000";

      for (const g of goals) {
        tgt = addMoney(tgt, g.target_amount);
        cur = addMoney(cur, g.current_amount);
      }

      const rem = subtractMoney(tgt, cur);
      let pct = 0;
      if (parseFloat(tgt) > 0) {
        pct = Math.min(
          Math.round((parseFloat(cur) / parseFloat(tgt)) * 100),
          100
        );
      }

      return {
        totalTarget: tgt,
        totalCurrent: cur,
        totalRemaining: rem,
        overallProgress: pct,
      };
    }, [goals]);

  const getPriorityBadgeClass = (priority?: string | null) => {
    switch (priority) {
      case "urgent":
        return "bg-danger/15 text-danger border-danger/30 font-bold";
      case "high":
        return "bg-warning/15 text-warning border-warning/30 font-semibold";
      case "low":
        return "bg-surface-secondary text-text-secondary border-border font-medium";
      default:
        return "bg-primary/10 text-primary border-primary/20 font-semibold";
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete goal "${name}"?`)) return;
    const res = await deleteGoalAction(id);
    if (res.success) {
      toast.success(res.message || "Goal deleted");
    } else {
      toast.error(res.error || "Failed to delete goal");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PlanHeader
        activeTab="goals"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCalculator(!showCalculator)}
              className="gap-1.5 h-9 rounded-xl border-border bg-surface text-text-secondary hover:text-text-primary"
            >
              <Calculator className="h-4 w-4" />
              <span>{showCalculator ? "Hide Calculator" : "Goal Calculator"}</span>
            </Button>
            <CreateGoalDialog />
          </div>
        }
      />

      {/* Unified Plan Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-secondary/70 rounded-xl border border-border/70 w-fit">
        <Link
          href="/budgets"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary transition-all"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Monthly Budgets</span>
        </Link>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-surface shadow-2xs">
          <Target className="h-3.5 w-3.5" />
          <span>Financial Goals</span>
        </div>
        <Link
          href="/recurring"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary transition-all"
        >
          <Repeat className="h-3.5 w-3.5" />
          <span>Recurring & Bills</span>
        </Link>
      </div>

      {/* Goal Calculator (Collapsible / Active) */}
      {showCalculator && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <GoalCalculator />
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Target Corpus"
          amount={totalTarget}
          subtitle="Combined milestone targets"
          icon={Target}
          iconColor="forest"
        />
        <MetricCard
          title="Total Saved So Far"
          amount={totalCurrent}
          subtitle="Accumulated goal capital"
          icon={PiggyBank}
          iconColor="emerald"
          coloredAmount
        />
        <MetricCard
          title="Corpus Gap"
          amount={totalRemaining}
          subtitle="Remaining capital to accumulate"
          icon={TrendingUp}
          iconColor="coral"
        />
        <MetricCard
          title="Overall Goal Progress"
          amount={`${overallProgress}%`}
          formatType="percent"
          subtitle={`${goals.filter((g) => toDecimal(g.current_amount).gte(g.target_amount)).length} of ${goals.length} goals achieved`}
          icon={Sparkles}
          iconColor="indigo"
        />
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-surface">
          <Target className="mx-auto h-12 w-12 text-text-secondary/40 mb-3" />
          <h3 className="text-base font-semibold text-text-primary">No financial goals set</h3>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 mb-4 max-w-md mx-auto">
            Establish long-term milestones like an emergency reserve, down payment, or retirement corpus to track capital accumulation and target pacing.
          </p>
          <CreateGoalDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const metrics = calculateGoalMonthlyRequired(
              goal.target_amount,
              goal.current_amount,
              goal.target_date
            );
            const isCompleted = metrics.progressPercent >= 100 || goal.is_completed;

            let recentVelocity = 0;
            if (goal.contributions && goal.contributions.length > 0) {
              const sum = goal.contributions.reduce(
                (acc: number, c: any) => acc + parseFloat(c.amount.toString()),
                0
              );
              recentVelocity = sum / Math.max(1, goal.contributions.length);
            }

            const trajectory = calculateGoalTrajectory(
              goal.target_amount,
              goal.current_amount,
              goal.target_date,
              recentVelocity
            );

            return (
              <Card
                key={goal.id}
                className="rounded-2xl border border-border/80 bg-surface shadow-2xs flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-2 h-4 rounded-md font-semibold border-primary/20 text-primary bg-primary/5"
                        >
                          {goal.category || "General"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-2 h-4 rounded-md capitalize ${getPriorityBadgeClass(
                            goal.priority
                          )}`}
                        >
                          {goal.priority || "Medium"} Priority
                        </Badge>
                        {isCompleted && (
                          <Badge className="text-[10px] py-0 px-2 h-4 rounded-md bg-success text-surface font-bold">
                            Completed
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-bold text-text-primary truncate pt-1">
                        {goal.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-text-secondary flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-primary" />
                        <span>Target: {format(new Date(goal.target_date), "dd MMM yyyy")}</span>
                      </CardDescription>
                    </div>

                    <ProgressRing
                      progress={metrics.progressPercent}
                      size={64}
                      strokeWidth={6}
                      strokeColor={isCompleted ? "var(--success)" : "var(--primary)"}
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4 flex-1 flex flex-col justify-between">
                  {/* Financial Metrics */}
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-text-secondary">Saved Capital:</span>
                      <MoneyDisplay
                        amount={goal.current_amount}
                        className="font-bold text-sm text-text-primary"
                      />
                    </div>

                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-text-secondary">Target Corpus:</span>
                      <MoneyDisplay
                        amount={goal.target_amount}
                        className="font-semibold text-text-secondary"
                      />
                    </div>

                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-text-secondary">Corpus Gap:</span>
                      <MoneyDisplay
                        amount={metrics.remainingAmount}
                        className={isCompleted ? "text-success font-bold" : "text-danger font-bold"}
                      />
                    </div>

                    {/* Monthly Required Pacing */}
                    {!isCompleted && (
                      <div className="p-2.5 rounded-xl bg-surface-secondary/70 border border-border/50 space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-text-secondary">Monthly Required:</span>
                          <span className="font-bold text-primary font-mono tabular-nums">
                            ₹{Math.ceil(parseFloat(metrics.monthlyRequired)).toLocaleString("en-IN")}/mo
                          </span>
                        </div>
                        <div className="text-[10px] text-text-secondary flex items-center justify-between">
                          <span>{metrics.monthsRemaining} months remaining</span>
                          {goal.planned_contribution_amount && (
                            <span className="text-text-primary font-medium">
                              Planned: ₹{parseFloat(goal.planned_contribution_amount.toString()).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setContributeTargetGoal(goal)}
                      className="flex-1 h-8 text-xs font-semibold bg-primary hover:bg-primary-hover text-surface rounded-xl shadow-xs gap-1"
                    >
                      <PiggyBank className="h-3.5 w-3.5" />
                      <span>Manage Funds</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(goal.id, goal.name)}
                      className="h-8 w-8 text-text-secondary hover:text-danger rounded-xl shrink-0"
                      title="Delete Goal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Contribute Modal */}
      <ContributeGoalDialog
        goal={contributeTargetGoal}
        accounts={accounts}
        open={!!contributeTargetGoal}
        onOpenChange={(open) => {
          if (!open) setContributeTargetGoal(null);
        }}
      />
    </div>
  );
}
