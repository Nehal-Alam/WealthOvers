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

export function MetricCard({
  title,
  amount,
  currency = "INR",
  subtitle,
  icon: Icon,
  iconColor = "text-primary bg-primary/10",
  trend,
  coloredAmount = false,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("overflow-hidden border shadow-sm", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between space-x-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </p>
          {Icon && (
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", iconColor)}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            <MoneyDisplay
              amount={amount}
              currency={currency}
              colored={coloredAmount}
            />
          </div>

          {(subtitle || trend) && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              {trend && (
                <span
                  className={cn(
                    "font-semibold inline-flex items-center",
                    trend.isPositive ? "text-emerald-500" : "text-rose-500"
                  )}
                >
                  {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
              )}
              {subtitle && <span>{subtitle}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
