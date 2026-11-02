"use client";

import * as React from "react";
import { Calculator, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function GoalCalculator() {
  const [targetAmount, setTargetAmount] = React.useState<string>("500000");
  const [currentAmount, setCurrentAmount] = React.useState<string>("100000");
  const [mode, setMode] = React.useState<"months" | "monthly">("months");
  const [months, setMonths] = React.useState<string>("24");
  const [monthlyContribution, setMonthlyContribution] = React.useState<string>("15000");

  const calculation = React.useMemo(() => {
    const target = parseFloat(targetAmount) || 0;
    const current = parseFloat(currentAmount) || 0;
    const remaining = Math.max(0, target - current);

    if (mode === "months") {
      const m = Math.max(1, parseInt(months) || 1);
      const reqMonthly = remaining / m;
      return {
        remaining,
        requiredMonthly: reqMonthly,
        monthsNeeded: m,
      };
    } else {
      const monthly = Math.max(1, parseFloat(monthlyContribution) || 1);
      const mNeeded = Math.ceil(remaining / monthly);
      return {
        remaining,
        requiredMonthly: monthly,
        monthsNeeded: mNeeded,
      };
    }
  }, [targetAmount, currentAmount, mode, months, monthlyContribution]);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary-soft flex items-center justify-center text-primary">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-text-primary">
              Goal Contribution Calculator
            </h4>
            <p className="text-[11px] text-text-secondary">
              Calculate the exact monthly savings velocity to hit your targets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-0.5 bg-surface-secondary/60 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setMode("months")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              mode === "months"
                ? "bg-primary text-surface font-semibold shadow-2xs"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            By Timeline
          </button>
          <button
            type="button"
            onClick={() => setMode("monthly")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              mode === "monthly"
                ? "bg-primary text-surface font-semibold shadow-2xs"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            By Budget
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-text-secondary">Target Goal (INR)</Label>
          <Input
            type="number"
            step="1000"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="h-8 text-xs font-semibold tabular-nums bg-surface-secondary/40 border-border"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-text-secondary">Already Saved (INR)</Label>
          <Input
            type="number"
            step="1000"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
            className="h-8 text-xs font-semibold tabular-nums bg-surface-secondary/40 border-border"
          />
        </div>

        {mode === "months" ? (
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-text-secondary">Timeline (Months)</Label>
            <Input
              type="number"
              min="1"
              max="240"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              className="h-8 text-xs font-semibold tabular-nums bg-surface-secondary/40 border-border"
            />
          </div>
        ) : (
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-text-secondary">Monthly Savings (INR)</Label>
            <Input
              type="number"
              step="500"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
              className="h-8 text-xs font-semibold tabular-nums bg-surface-secondary/40 border-border"
            />
          </div>
        )}
      </div>

      {/* Result Callout */}
      <div className="p-3.5 rounded-xl bg-surface-secondary/40 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-[11px] font-medium text-text-secondary">
            {mode === "months" ? "Required Monthly Contribution" : "Estimated Completion Timeline"}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold tabular-nums text-primary">
              {mode === "months"
                ? `₹${Math.round(calculation.requiredMonthly).toLocaleString("en-IN")} / month`
                : `${calculation.monthsNeeded} Months (${(calculation.monthsNeeded / 12).toFixed(1)} years)`}
            </span>
          </div>
        </div>

        <div className="text-right sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
          <span className="text-[11px] text-text-secondary block">Total Remaining Gap</span>
          <span className="text-sm font-bold tabular-nums text-text-primary">
            ₹{calculation.remaining.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  );
}
