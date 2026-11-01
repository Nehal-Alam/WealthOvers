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

const emptySubscribe = () => () => {};

/**
 * Concurrent-safe hydration snapshot hook using useSyncExternalStore.
 * Avoids cascading useState/useEffect updates across dozens of table rows on initial mount.
 */
function useIsHydrated() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export const MoneyDisplay = React.memo(function MoneyDisplay({
  amount,
  currency = "INR",
  locale = "en-IN",
  positiveSign = false,
  colored = false,
  className,
  ...props
}: MoneyDisplayProps) {
  const isPrivacyMode = useUIStore((state) => state.isPrivacyMode);
  const isHydrated = useIsHydrated();

  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const isPositive = num > 0;
  const isNegative = num < 0;

  let colorClass = "";
  if (colored) {
    if (isPositive) colorClass = "text-emerald-600 dark:text-emerald-400";
    else if (isNegative) colorClass = "text-destructive";
    else colorClass = "text-muted-foreground";
  }

  const prefix = positiveSign && isPositive ? "+" : "";

  return (
    <span
      className={`${colorClass} font-mono tracking-tight ${className || ""}`}
      {...props}
    >
      {prefix}
      {isHydrated
        ? formatCurrency(amount, currency, locale, isPrivacyMode)
        : formatCurrency(amount, currency, locale, false)}
    </span>
  );
});
