"use client";

import * as React from "react";
import {
  Target,
  PlusCircle,
  PiggyBank,
  Calendar,
  CheckCircle2,
  Trash2,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";
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
      return "border-violet-500/30 text-violet-500 bg-violet-500/10";
    }
    if (c.includes("home") || c.includes("house") || c.includes("property")) {
      return "border-emerald-500/30 text-emerald-500 bg-emerald-500/10";
    }
    if (c.includes("car") || c.includes("vehicle") || c.includes("bike")) {
      return "border-amber-500/30 text-amber-500 bg-amber-500/10";
    }
    if (c.includes("vacation") || c.includes("travel") || c.includes("trip")) {
      return "border-primary/20 text-primary bg-primary/5";
    }
    if (c.includes("wedding") || c.includes("family") || c.includes("education")) {
      return "border-destructive/30 text-destructive bg-destructive/10";
    }
    return "border-border text-muted-foreground bg-muted/40";
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
          <h2 className="text-xl font-bold tracking-tight">Financial Goals</h2>
          <p className="text-sm text-muted-foreground">
            Plan, monitor, and achieve milestone financial targets with required monthly pacing.
          </p>
        </div>

        <CreateGoalDialog />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Target Corpus"
          amount={totalTarget}
          subtitle="Combined milestone targets"
          icon={Target}
          iconColor="#3B82F6"
        />
        <MetricCard
          title="Total Saved So Far"
          amount={totalCurrent}
          subtitle="Accumulated goal capital"
          icon={PiggyBank}
          iconColor="#10B981"
          coloredAmount
        />
        <MetricCard
          title="Corpus Gap"
          amount={totalRemaining}
          subtitle="Remaining capital to accumulate"
          icon={TrendingUp}
          iconColor="#F59E0B"
        />
        <MetricCard
          title="Overall Goal Progress"
          amount={`${overallProgress}%`}
          subtitle={`${goals.filter((g) => g.current_amount >= g.target_amount).length} of ${goals.length} goals achieved`}
          icon={Sparkles}
          iconColor="#8B5CF6"
        />
      </div>

      {goals.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center bg-card">
          <Target className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold">No financial goals set</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Create long-term targets like retirement, a home purchase, or emergency reserves.
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

            return (
              <Card
                key={goal.id}
                className={`overflow-hidden border shadow-sm transition-all hover:shadow-md ${
                  isCompleted ? "border-emerald-500/30 bg-emerald-500/[0.03]" : ""
                }`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-2 h-4.5 font-medium ${getGoalCategoryBadgeClass(
                            goal.category
                          )}`}
                        >
                          {goal.category}
                        </Badge>
                        {!isCompleted && trajectory.projectedMonthsToComplete !== null && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0 px-1.5 h-4.5 ${
                              trajectory.isOnTrack
                                ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                                : "border-amber-500/30 text-amber-500 bg-amber-500/10"
                            }`}
                          >
                            {trajectory.isOnTrack ? "On Track" : "Pacing Lag"}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-semibold mt-1">
                        {goal.name}
                      </CardTitle>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(goal.id, goal.name)}
                      aria-label="Delete goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground">Progress</span>
                      <span
                        className={`text-xs font-mono font-bold ${
                          isCompleted ? "text-emerald-600" : "text-primary"
                        }`}
                      >
                        {metrics.progressPercent}%
                      </span>
                    </div>

                    <Progress
                      value={metrics.progressPercent}
                      indicatorClassName={isCompleted ? "bg-emerald-500" : "bg-primary"}
                      className="h-2"
                    />

                    <div className="flex justify-between text-xs text-muted-foreground pt-0.5">
                      <span>Saved: <MoneyDisplay amount={goal.current_amount} /></span>
                      <span>Target: <MoneyDisplay amount={goal.target_amount} /></span>
                    </div>
                  </div>

                  {/* Monthly Required Target */}
                  {!isCompleted ? (
                    <div className="p-2.5 rounded-lg border bg-muted/30 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">
                          Required Monthly Savings
                        </span>
                        <span className="font-mono font-bold text-sm text-primary">
                          <MoneyDisplay amount={metrics.monthlyRequired} /> / mo
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground block text-[11px]">
                          Time Remaining
                        </span>
                        <span className="font-mono font-semibold">
                          {metrics.monthsRemaining} month(s)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 text-xs font-semibold">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Target Milestone Achieved!</span>
                    </div>
                  )}

                  {/* Footer Action */}
                  <div className="flex items-center justify-between pt-2 border-t text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Target: {format(new Date(goal.target_date), "MMM yyyy")}
                    </span>

                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1"
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

