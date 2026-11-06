"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Layers,
  Target,
  Repeat,
  Calendar as CalendarIcon,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PlanSectionTab = "budgets" | "goals" | "recurring" | "calendar" | "analytics";

interface PlanNavigationProps {
  activeTab?: PlanSectionTab;
  className?: string;
}

export function PlanNavigation({ activeTab, className }: PlanNavigationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Resolve current active tab cleanly based on pathname or tab param
  const currentTab: PlanSectionTab = React.useMemo(() => {
    if (activeTab) return activeTab;
    if (pathname === "/budgets" || pathname.startsWith("/budgets")) return "budgets";
    if (pathname === "/goals" || pathname.startsWith("/goals")) return "goals";
    if (pathname === "/recurring" || pathname.startsWith("/recurring")) return "recurring";
    if (pathname.startsWith("/plan")) {
      const tabParam = searchParams.get("tab");
      if (tabParam === "goals") return "goals";
      if (tabParam === "recurring") return "recurring";
      if (tabParam === "calendar") return "calendar";
      if (tabParam === "analytics" || tabParam === "reports") return "analytics";
      return "budgets";
    }
    return "budgets";
  }, [activeTab, pathname, searchParams]);

  const navItems: { id: PlanSectionTab; label: string; href: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "budgets", label: "Budgets", href: "/budgets", icon: Layers },
    { id: "goals", label: "Financial Goals", href: "/goals", icon: Target },
    { id: "recurring", label: "Recurring & Bills", href: "/recurring", icon: Repeat },
    { id: "calendar", label: "Planning Calendar", href: "/plan?tab=calendar", icon: CalendarIcon },
    { id: "analytics", label: "Analytics", href: "/plan?tab=analytics", icon: BarChart3 },
  ];

  return (
    <nav
      aria-label="Financial Planning Sections"
      className={cn(
        "flex items-center gap-1 p-1 bg-surface-secondary/70 rounded-xl border border-border/70 overflow-x-auto no-scrollbar w-fit",
        className
      )}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150",
              isActive
                ? "bg-primary text-surface shadow-2xs font-bold"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-secondary"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
