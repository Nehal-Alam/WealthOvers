"use client";

import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Plus,
  ArrowLeftRight,
  AlertCircle,
  Calendar,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/financial/money-display";
import { useUIStore } from "@/stores/ui-store";
import type { SafeToSpendResult } from "@/lib/calculations/financial";

interface SafeToSpendHeroProps {
  safeToSpend: SafeToSpendResult;
  monthlyInflow: string;
  monthlyOutflow: string;
  currency?: string;
  userName?: string;
}

export function SafeToSpendHero({
  safeToSpend,
  monthlyInflow,
  monthlyOutflow,
  currency = "INR",
  userName = "Investor",
}: SafeToSpendHeroProps) {
  const { openQuickTransaction } = useUIStore();

  const paceBadge = React.useMemo(() => {
    switch (safeToSpend.paceStatus) {
      case "ahead":
        return {
          label: "Pacing Well Ahead",
          color: "bg-success/10 text-success border-success/20",
          icon: Sparkles,
        };
      case "caution":
        return {
          label: "Spend Approaching Limit",
          color: "bg-warning/10 text-warning border-warning/20",
          icon: AlertCircle,
        };
      case "depleted":
        return {
          label: "Safe Budget Depleted",
          color: "bg-danger/10 text-danger border-danger/20",
          icon: AlertCircle,
        };
      default:
        return {
          label: "On Healthy Track",
          color: "bg-primary/10 text-primary border-primary/20",
          icon: ShieldCheck,
        };
    }
  }, [safeToSpend.paceStatus]);

  const PaceIcon = paceBadge.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs transition-all">
      {/* Subtle organic top accent glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-accent/40" />

      {/* Hero Header: Leftovers Question */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
              SAFE TO SPEND TODAY
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${paceBadge.color}`}
            >
              <PaceIcon className="h-3 w-3" />
              {paceBadge.label}
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-medium text-muted-foreground">
            How much money do I have, and how much can I safely spend?
          </h2>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            onClick={() => openQuickTransaction("expense")}
            className="h-8.5 px-3 bg-primary text-primary-foreground hover:bg-primary-hover font-medium shadow-2xs text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Expense</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openQuickTransaction("transfer")}
            className="h-8.5 px-3 border-border/80 text-foreground hover:bg-muted font-medium text-xs gap-1.5"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Transfer</span>
          </Button>
        </div>
      </div>

      {/* Main Big Number Hero Display */}
      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-4 pb-6 border-b border-border/80">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground font-mono">
              <MoneyDisplay
                amount={safeToSpend.safeToSpendToday}
                currency={currency}
              />
            </span>
            <span className="text-base sm:text-lg font-medium text-muted-foreground">
              / day
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
            Safe remaining pool of{" "}
            <span className="font-semibold text-foreground font-mono">
              <MoneyDisplay
                amount={safeToSpend.safeRemainingPool}
                currency={currency}
              />
            </span>{" "}
            over the next{" "}
            <span className="font-semibold text-foreground font-mono">
              {safeToSpend.daysRemaining} days
            </span>{" "}
            until next cycle.
          </p>
        </div>

        {/* Days & Health Pacing Indicator */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-secondary/60 border border-border/60 self-start md:self-auto">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <span className="text-[11px] text-muted-foreground font-medium">
              Month Progress
            </span>
            <p className="text-sm font-bold text-foreground">
              {safeToSpend.daysRemaining} days left
            </p>
          </div>
        </div>
      </div>

      {/* Visual Pacing Meter Bar */}
      <div className="pt-4 pb-5">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">
            Monthly Budget Utilized ({safeToSpend.pacingPercentage}%)
          </span>
          <span className="font-medium text-foreground font-mono">
            <MoneyDisplay
              amount={safeToSpend.amountSpentThisMonth}
              currency={currency}
            />{" "}
            of{" "}
            <MoneyDisplay
              amount={safeToSpend.totalLiquidAvailable}
              currency={currency}
            />
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              safeToSpend.pacingPercentage > 90
                ? "bg-danger"
                : safeToSpend.pacingPercentage > 75
                ? "bg-warning"
                : "bg-primary"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, safeToSpend.pacingPercentage))}%` }}
          />
        </div>
      </div>

      {/* Sub-Metrics 5-Item Responsive Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
        {/* Metric 1: Spent This Month */}
        <div className="p-3 rounded-xl bg-surface-secondary/40 border border-border/60">
          <span className="text-[11px] text-muted-foreground font-medium block mb-0.5">
            Spent This Month
          </span>
          <p className="text-base font-bold text-foreground font-mono">
            <MoneyDisplay
              amount={safeToSpend.amountSpentThisMonth}
              currency={currency}
            />
          </p>
        </div>

        {/* Metric 2: Remaining Budget */}
        <div className="p-3 rounded-xl bg-surface-secondary/40 border border-border/60">
          <span className="text-[11px] text-muted-foreground font-medium block mb-0.5">
            Remaining Budget
          </span>
          <p className="text-base font-bold text-foreground font-mono">
            <MoneyDisplay
              amount={safeToSpend.remainingBudget}
              currency={currency}
            />
          </p>
        </div>

        {/* Metric 3: Monthly Inflow */}
        <div className="p-3 rounded-xl bg-surface-secondary/40 border border-border/60">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mb-0.5">
            <TrendingUp className="h-3 w-3 text-success" />
            Monthly Income
          </span>
          <p className="text-base font-bold text-success font-mono">
            <MoneyDisplay
              amount={monthlyInflow}
              currency={currency}
            />
          </p>
        </div>

        {/* Metric 4: Monthly Outflow */}
        <div className="p-3 rounded-xl bg-surface-secondary/40 border border-border/60">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mb-0.5">
            <TrendingDown className="h-3 w-3 text-danger" />
            Monthly Expenses
          </span>
          <p className="text-base font-bold text-danger font-mono">
            <MoneyDisplay
              amount={monthlyOutflow}
              currency={currency}
            />
          </p>
        </div>

        {/* Metric 5: Available Liquid Cash */}
        <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-surface-secondary/40 border border-border/60">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mb-0.5">
            <Wallet className="h-3 w-3 text-primary" />
            Liquid Available
          </span>
          <p className="text-base font-bold text-foreground font-mono">
            <MoneyDisplay
              amount={safeToSpend.totalLiquidAvailable}
              currency={currency}
            />
          </p>
        </div>
      </div>
    </div>
  );
}
