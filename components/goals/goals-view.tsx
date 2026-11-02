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
} from "@/lib/calculations/financial";

interface GoalWithContributions extends Tables<"financial_goals"> {
  contributions?: Tables<"goal_contributions">[];
}

interface GoalsViewProps {
  goals: GoalWithContributions[];
}

export function GoalsView({ goals }: GoalsViewProps) {
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

  const getGoalCategoryBadgeClass = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes("emergency") || c.includes("safety")) {
      return "border-primary/30 text-primary bg-primary/10";
    }
    if (c.includes("retire") || c.includes("pension")) {
      return "border-primary/30 text-primary bg-primary/10";
    }
    if (c.includes("home") || c.includes("house") || c.includes("property")) {
      return "border-success/30 text-success bg-success/10";
    }
    if (c.includes("car") || c.includes("vehicle") || c.includes("bike")) {
      return "border-warning/30 text-warning bg-warning/10";
    }
    if (c.includes("vacation") || c.includes("travel") || c.includes("trip")) {
      return "border-primary/20 text-primary bg-primary/5";
    }
    if (c.includes("wedding") || c.includes("family") || c.includes("education")) {
      return "border-danger/30 text-danger bg-danger/10";
    }
    return "border-border text-text-secondary bg-surface-secondary";
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            Financial Goals & Milestones
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            SVG circular progress meters, target pacing, and monthly contribution calculators.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
      </div>

      {/* Unified Plan Tabs */}
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
          subtitle={`${goals.filter((g) => g.current_amount >= g.target_amount).length} of ${goals.length} goals achieved`}
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
            Create long-term targets like retirement, a home purchase, or emergency reserves to start tracking your progress.
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
            const isCompleted = metrics.progressPercent >= 100;

            let recentVelocity = 0;
            if (goal.contributions && goal.contributions.length > 0) {
              const sum = goal.contributions.reduce((acc: number, c: any) => acc + parseFloat(c.amount.toString()), 0);
              recentVelocity = sum / Math.max(1, goal.contributions.length);
            }
            const trajectory = calculateGoalTrajectory(
              goal.target_amount,
              goal.current_amount,
              goal.target_date,
              recentVelocity
            );

            const remainingAmount = subtractMoney(goal.target_amount, goal.current_amount);

            return (
              <Card
                key={goal.id}
                className={`overflow-hidden border border-border/80 bg-surface rounded-2xl shadow-2xs transition-all hover:shadow-xs ${
                  isCompleted ? "border-success/30 bg-success/5" : ""
                }`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-2 h-4.5 font-medium rounded-md ${getGoalCategoryBadgeClass(
                            goal.category
                          )}`}
                        >
                          {goal.category}
                        </Badge>
                        {!isCompleted && trajectory.projectedMonthsToComplete !== null && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0 px-1.5 h-4.5 rounded-md ${
                              trajectory.isOnTrack
                                ? "border-success/30 text-success bg-success/10"
                                : "border-warning/30 text-warning bg-warning/10"
                            }`}
                          >
                            {trajectory.isOnTrack ? "On Track" : "Pacing Lag"}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-bold text-text-primary mt-1.5 truncate">
                        {goal.name}
                      </CardTitle>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-text-secondary hover:text-danger shrink-0"
                      onClick={() => handleDelete(goal.id, goal.name)}
                      aria-label="Delete goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-4">
                  {/* Leftovers-style Circular Progress Ring & Numbers */}
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-secondary/40 border border-border/60">
                    <ProgressRing
                      progress={metrics.progressPercent}
                      size={72}
                      strokeWidth={6.5}
                      strokeColor={isCompleted ? "#39805B" : "var(--primary)"}
                      trackColor="var(--border)"
                    />

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-text-secondary">Saved</span>
                        <span className="font-bold tabular-nums text-text-primary">
                          ₹{parseFloat(goal.current_amount as any).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-text-secondary">Target</span>
                        <span className="font-bold tabular-nums text-text-primary">
                          ₹{parseFloat(goal.target_amount as any).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline text-xs pt-0.5 border-t border-border/50">
                        <span className="text-text-secondary">Remaining</span>
                        <span className={`font-bold tabular-nums ${isCompleted ? "text-success" : "text-text-primary"}`}>
                          {isCompleted ? "Goal Reached!" : `₹${parseFloat(remainingAmount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Required Target */}
                  {!isCompleted ? (
                    <div className="p-2.5 rounded-xl border border-border/70 bg-surface flex justify-between items-center text-xs">
                      <div>
                        <span className="text-text-secondary block text-[11px] font-medium">
                          Required Monthly Savings
                        </span>
                        <span className="font-mono font-bold text-sm text-primary">
                          <MoneyDisplay amount={metrics.monthlyRequired} /> / mo
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-text-secondary block text-[11px] font-medium">
                          Time Left
                        </span>
                        <span className="font-mono font-semibold text-text-primary">
                          {metrics.monthsRemaining} month(s)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl border border-success/30 bg-success/10 text-success flex items-center gap-2 text-xs font-semibold">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Target Milestone Achieved!</span>
                    </div>
                  )}

                  {/* Footer Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                    <span className="text-text-secondary flex items-center gap-1 text-[11px]">
                      <Calendar className="h-3 w-3" />
                      Target: {format(new Date(goal.target_date), "MMM yyyy")}
                    </span>

                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5 rounded-xl bg-primary hover:bg-primary-hover text-surface font-semibold shadow-xs transition-colors"
                      onClick={() => setContributeTargetGoal(goal)}
                    >
                      <PiggyBank className="h-3.5 w-3.5" />
                      <span>Add Funds</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Contribute Funds Modal */}
      <ContributeGoalDialog
        goal={contributeTargetGoal}
        open={!!contributeTargetGoal}
        onOpenChange={(open) => !open && setContributeTargetGoal(null)}
      />
    </div>
  );
}
