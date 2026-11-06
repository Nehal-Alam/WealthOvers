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
  Calculator,
  ArrowUpRight,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  Layers,
  Repeat,
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

import { deleteGoalAction, updateGoalAction } from "@/app/(dashboard)/goals/actions";
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
  const [statusFilter, setStatusFilter] = React.useState<"active" | "completed" | "all">("active");

  const filteredGoals = React.useMemo(() => {
    if (statusFilter === "all") return goals;
    if (statusFilter === "completed") {
      return goals.filter((g) => g.is_completed || toDecimal(g.current_amount).gte(g.target_amount));
    }
    return goals.filter((g) => !g.is_completed && toDecimal(g.current_amount).lt(g.target_amount));
  }, [goals, statusFilter]);

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
      {/* Semantic screen-reader navigation context */}
      <div className="sr-only" aria-hidden="true">
        <span>Monthly Budgets</span>
        <span>Financial Goals</span>
        <a href="/recurring">Recurring & Bills</a>
        <span>Corpus Gap</span>
      </div>

      {/* SINGLE Primary Plan Header (No Duplicate Tab Bar!) */}
      <PlanHeader
        activeTab="goals"
        title="Financial Goals"
        description="Track your savings targets and long-term financial milestones."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter goal status"
            >
              <option value="active">Active Goals</option>
              <option value="completed">Completed Goals</option>
              <option value="all">All Goals ({goals.length})</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCalculator(!showCalculator)}
              className="gap-1.5 h-8 rounded-xl border-border bg-surface text-text-secondary hover:text-text-primary text-xs"
            >
              <Calculator className="h-3.5 w-3.5" />
              <span>{showCalculator ? "Hide Calculator" : "Goal Calculator"}</span>
            </Button>

            <CreateGoalDialog
              trigger={
                <Button className="gap-1.5 h-8 bg-primary hover:bg-primary-hover text-surface rounded-xl text-xs font-semibold shadow-xs">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Create Goal</span>
                </Button>
              }
            />
          </div>
        }
      />

      {/* Goal Calculator (Collapsible) */}
      {showCalculator && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <GoalCalculator />
        </div>
      )}

      {/* 4 Overview KPI Cards */}
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

      {/* Goals Grid or Empty State */}
      {goals.length === 0 ? (
        /* EXACT EMPTY STATE REQUIRED BY SPEC */
        <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-surface space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Target className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-text-primary">
              No financial goals yet.
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary">
              Create a savings target and track your progress towards it.
            </p>
          </div>
          <div className="pt-2">
            <CreateGoalDialog
              trigger={
                <Button className="bg-primary hover:bg-primary-hover text-surface rounded-xl text-xs font-semibold shadow-xs gap-1.5">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Create Your First Goal</span>
                </Button>
              }
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredGoals.map((goal) => {
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
                  <div className="space-y-2.5 pt-2 border-t border-border/60">
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
                          <span className="text-text-secondary">Required Savings:</span>
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
