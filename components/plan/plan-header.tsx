"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Layers,
  Target,
  Repeat,
  Calendar as CalendarIcon,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateDurationFilter } from "@/lib/calculations/date-ranges";

export type PlanTab = "budgets" | "goals" | "recurring" | "calendar" | "reports";

interface PlanHeaderProps {
  activeTab?: PlanTab;
  currentPeriod?: string;
  onPeriodChange?: (period: string) => void;
  periodLabel?: string;
  onPrevPeriod?: () => void;
  onNextPeriod?: () => void;
  actions?: React.ReactNode;
}

const planningPeriods: { id: DateDurationFilter | "next_month"; label: string }[] = [
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "next_month", label: "Next Month" },
  { id: "last_month", label: "Last Month" },
  { id: "last_3_months", label: "Last 3 Months" },
  { id: "this_quarter", label: "This Quarter" },
  { id: "this_year", label: "This Year" },
  { id: "financial_year", label: "Financial Year (Apr-Mar)" },
  { id: "all_time", label: "All Time" },
  { id: "custom", label: "Custom Period" },
];

export function PlanHeader({
  activeTab,
  currentPeriod = "this_month",
  onPeriodChange,
  periodLabel,
  onPrevPeriod,
  onNextPeriod,
  actions,
}: PlanHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Determine current tab from pathname or search param
  const resolvedTab: PlanTab = React.useMemo(() => {
    if (activeTab) return activeTab;
    if (pathname.includes("/goals")) return "goals";
    if (pathname.includes("/recurring")) return "recurring";
    if (pathname.includes("/budgets")) return "budgets";
    const tabParam = searchParams.get("tab") as PlanTab;
    if (["budgets", "goals", "recurring", "calendar", "reports"].includes(tabParam)) {
      return tabParam;
    }
    return "budgets";
  }, [activeTab, pathname, searchParams]);

  const isOnPlanRoute = pathname.startsWith("/plan");
  const tabs = [
    {
      id: "budgets",
      label: "Monthly Budgets",
      href: isOnPlanRoute ? "/plan?tab=budgets" : "/budgets",
      icon: Layers,
    },
    {
      id: "goals",
      label: "Financial Goals",
      href: isOnPlanRoute ? "/plan?tab=goals" : "/goals",
      icon: Target,
    },
    {
      id: "recurring",
      label: "Recurring & Bills",
      href: isOnPlanRoute ? "/plan?tab=recurring" : "/recurring",
      icon: Repeat,
    },
    {
      id: "calendar",
      label: "Planning Calendar",
      href: "/plan?tab=calendar",
      icon: CalendarIcon,
    },
    {
      id: "reports",
      label: "Analytics & Forecast",
      href: "/plan?tab=reports",
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Bar with Title, Period Navigation, and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Financial Planning
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              Live Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Unified spending envelopes, long-term goals, bill schedules, and cashflow velocity.
          </p>
        </div>

        {/* Right side: Period selector and Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Selector Controls */}
          {onPeriodChange && (
            <div className="flex items-center bg-surface border border-border/80 rounded-xl p-0.5 shadow-2xs">
              {onPrevPeriod && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPrevPeriod}
                  className="h-8 w-8 text-text-secondary hover:text-text-primary rounded-lg"
                  title="Previous Period"
                  aria-label="Previous Period"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}

              <Select value={currentPeriod} onValueChange={onPeriodChange}>
                <SelectTrigger className="h-8 border-0 bg-transparent text-xs font-medium text-text-primary focus:ring-0 focus:ring-offset-0 gap-1.5 px-2">
                  <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent className="bg-surface text-text-primary border-border">
                  {planningPeriods.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {onNextPeriod && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNextPeriod}
                  className="h-8 w-8 text-text-secondary hover:text-text-primary rounded-lg"
                  title="Next Period"
                  aria-label="Next Period"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Period Range Badge if available */}
          {periodLabel && (
            <div className="hidden lg:flex items-center text-[11px] font-mono text-text-secondary px-2.5 py-1 rounded-lg bg-surface-secondary border border-border/60">
              {periodLabel}
            </div>
          )}

          {/* Action triggers */}
          {actions}
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="flex items-center gap-1 p-1 bg-surface-secondary/70 rounded-xl border border-border/70 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = resolvedTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150",
                isActive
                  ? "bg-primary text-surface shadow-2xs font-bold"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-secondary"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
