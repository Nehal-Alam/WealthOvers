"use client";

import * as React from "react";
import { PlanNavigation, PlanSectionTab } from "./plan-navigation";
import { PeriodSelector } from "./period-selector";

interface PlanHeaderProps {
  activeTab?: PlanSectionTab;
  title?: string;
  description?: string;
  currentPeriod?: string;
  onPeriodChange?: (period: string) => void;
  referenceDate?: Date;
  onReferenceDateChange?: (date: Date) => void;
  periodLabel?: string;
  actions?: React.ReactNode;
}

const defaultHeadings: Record<PlanSectionTab, { title: string; description: string }> = {
  budgets: {
    title: "Budgets & Limits",
    description: "Manage spending limits, monitor expenses, and plan your monthly finances.",
  },
  goals: {
    title: "Financial Goals",
    description: "Track your savings targets and long-term financial milestones.",
  },
  recurring: {
    title: "Recurring & Bills",
    description: "Track rent, utilities, subscriptions, EMIs, and scheduled commitments.",
  },
  calendar: {
    title: "Planning Calendar",
    description: "Unified cashflow forecast, bill schedules, and milestone due dates.",
  },
  analytics: {
    title: "Financial Analytics & Forecast",
    description: "Historical spending trends, budget-to-actual variance, and cashflow projections.",
  },
};

export function PlanHeader({
  activeTab = "budgets",
  title,
  description,
  currentPeriod,
  onPeriodChange,
  referenceDate,
  onReferenceDateChange,
  periodLabel,
  actions,
}: PlanHeaderProps) {
  const heading = defaultHeadings[activeTab] || defaultHeadings.budgets;
  const resolvedTitle = title || heading.title;
  const resolvedDesc = description || heading.description;

  return (
    <div className="space-y-4">
      {/* Top Header Row with Title, Period Controls, and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {resolvedTitle}
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5 max-w-2xl">
            {resolvedDesc}
          </p>
        </div>

        {/* Right side: Period selector and action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodSelector
            currentPeriod={currentPeriod}
            onPeriodChange={onPeriodChange}
            referenceDate={referenceDate}
            onReferenceDateChange={onReferenceDateChange}
          />

          {periodLabel && (
            <div className="hidden lg:flex items-center text-[11px] font-mono text-text-secondary px-2.5 py-1 rounded-lg bg-surface-secondary border border-border/60">
              {periodLabel}
            </div>
          )}

          {actions}
        </div>
      </div>

      {/* SINGLE Primary Tab Navigation Row (No duplication!) */}
      <PlanNavigation activeTab={activeTab} />
    </div>
  );
}
