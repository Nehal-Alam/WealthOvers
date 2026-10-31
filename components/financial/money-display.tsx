"use client";

import * as React from "react";
import { useUIStore } from "@/stores/ui-store";
import { formatCurrency } from "@/lib/utils";

interface MoneyDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  amount: number | string;
  currency?: string;
  locale?: string;
  positiveSign?: boolean;
  colored?: boolean;
}

export function MoneyDisplay({
  amount,
  currency = "INR",
  locale = "en-IN",
  positiveSign = false,
  colored = false,
  className,
  ...props
}: MoneyDisplayProps) {
  const isPrivacyMode = useUIStore((state) => state.isPrivacyMode);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const isPositive = num > 0;
  const isNegative = num < 0;

  let colorClass = "";
  if (colored) {
    if (isPositive) colorClass = "text-emerald-600 dark:text-emerald-400";
    else if (isNegative) colorClass = "text-rose-600 dark:text-rose-400";
    else colorClass = "text-muted-foreground";
  }

  const prefix = positiveSign && isPositive ? "+" : "";

  return (
    <span
      className={`${colorClass} font-mono tracking-tight ${className || ""}`}
      {...props}
    >
      {prefix}
      {mounted
        ? formatCurrency(amount, currency, locale, isPrivacyMode)
        : formatCurrency(amount, currency, locale, false)}
    </span>
  );
}

