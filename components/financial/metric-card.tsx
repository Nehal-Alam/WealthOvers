import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/financial/money-display";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  amount: number | string;
  currency?: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  coloredAmount?: boolean;
  className?: string;
}

function resolveIconColorClass(color?: string): string {
  if (!color) return "text-primary bg-primary/10";

  // Semantic keyword or legacy hex resolution
  if (color === "emerald" || color.includes("#0F9F75") || color.includes("#10B981") || color.includes("emerald")) {
    return "text-emerald-500 bg-emerald-500/10";
  }
  if (color === "coral" || color === "destructive" || color.includes("#E05B67") || color.includes("#F87171") || color.includes("destructive") || color.includes("coral")) {
    return "text-destructive bg-destructive/10";
  }
  if (color === "violet" || color.includes("#8B7CF6") || color.includes("#8B5CF6") || color.includes("violet")) {
    return "text-violet-500 bg-violet-500/10";
  }
  if (color === "amber" || color.includes("#D99A35") || color.includes("#F59E0B") || color.includes("amber")) {
    return "text-amber-500 bg-amber-500/10";
  }
  if (color === "indigo" || color === "primary" || color.includes("#365CF5") || color.includes("#4F46E5") || color.includes("primary")) {
    return "text-primary bg-primary/10";
  }

  // Already a composite Tailwind string
  if (color.startsWith("text-") || color.startsWith("bg-")) {
    return color;
  }

  return "text-primary bg-primary/10";
}

export const MetricCard = React.memo(function MetricCard({
  title,
  amount,
  currency = "INR",
  subtitle,
  icon: Icon,
  iconColor,
  trend,
  coloredAmount = false,
  className,
}: MetricCardProps) {
  const iconClasses = React.useMemo(() => resolveIconColorClass(iconColor), [iconColor]);

  return (
    <Card className={cn("overflow-hidden border border-border/80 bg-card shadow-xs transition-colors", className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between space-x-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </p>
          {Icon && (
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", iconClasses)}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="mt-2.5 sm:mt-3">
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            <MoneyDisplay
              amount={amount}
              currency={currency}
              colored={coloredAmount}
            />
          </div>

          {(subtitle || trend) && (
            <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              {trend && (
                <span
                  className={cn(
                    "font-semibold inline-flex items-center shrink-0",
                    trend.isPositive ? "text-emerald-500" : "text-destructive"
                  )}
                >
                  {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
              )}
              {subtitle && <span className="truncate">{subtitle}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
