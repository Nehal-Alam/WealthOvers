"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Landmark,
  Wallet,
  CreditCard,
  Building,
  Coins,
  ArrowLeftRight,
  Plus,
} from "lucide-react";
import { Tables } from "@/types/database";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import Decimal from "decimal.js";
import { toDecimal } from "@/lib/calculations/financial";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface MobileAccountsViewProps {
  accounts: Tables<"accounts">[];
  onOpenCreateAccount: () => void;
  onOpenTransfer: (acc?: Tables<"accounts">) => void;
  onOpenHistory?: (acc: Tables<"accounts">) => void;
  onOpenEdit?: (acc: Tables<"accounts">) => void;
  onSelectAccount?: (acc: Tables<"accounts">) => void;
}

function getAccountBadge(type: string) {
  switch (type) {
    case "savings":
    case "salary":
    case "checking":
      return {
        icon: <Landmark className="h-4 w-4" />,
        label: "Bank Account",
        bg: "bg-mobile-accent/15",
        text: "text-mobile-accent",
      };
    case "cash":
    case "wallet":
      return {
        icon: <Wallet className="h-4 w-4" />,
        label: "Liquid Cash",
        bg: "bg-mobile-income/15",
        text: "text-mobile-income",
      };
    case "credit_card":
      return {
        icon: <CreditCard className="h-4 w-4" />,
        label: "Credit Card",
        bg: "bg-mobile-expense/15",
        text: "text-mobile-expense",
      };
    case "demat":
    case "investment":
      return {
        icon: <Coins className="h-4 w-4" />,
        label: "Demat & Portfolio",
        bg: "bg-mobile-investment/15",
        text: "text-mobile-investment",
      };
    default:
      return {
        icon: <Building className="h-4 w-4" />,
        label: "Account",
        bg: "bg-mobile-secondary",
        text: "text-mobile-secondaryText",
      };
  }
}

export function MobileAccountsView({
  accounts,
  onOpenCreateAccount,
  onOpenTransfer,
  onOpenHistory,
  onOpenEdit,
  onSelectAccount,
}: MobileAccountsViewProps) {
  const { isPrivacyMode, togglePrivacyMode } = useUIStore();

  const activeAccounts = React.useMemo(
    () => accounts.filter((a) => !a.is_archived),
    [accounts]
  );

  const totalAcrossAccounts = React.useMemo(() => {
    let sum = new Decimal(0);
    for (const a of activeAccounts) {
      if (a.account_type === "credit_card") {
        sum = sum.minus(toDecimal(a.current_balance || 0));
      } else {
        sum = sum.plus(toDecimal(a.current_balance || 0));
      }
    }
    return sum.toNumber();
  }, [activeAccounts]);

  return (
    <div className="flex flex-col space-y-4 max-w-md mx-auto pb-32 text-mobile-primary select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER WITH BACK BUTTON & THEME TOGGLE
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 px-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-mono text-mobile-secondaryText hover:text-mobile-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-xl font-bold tracking-tight text-mobile-primary font-mono">
            Accounts
          </span>
        </Link>

        <div className="flex items-center space-x-1.5">
          <div className="h-9 w-9 rounded-full bg-mobile-surface border border-mobile-border flex items-center justify-center text-mobile-secondaryText hover:text-mobile-primary transition-all">
            <ThemeToggle />
          </div>

          <button
            onClick={togglePrivacyMode}
            className="h-9 w-9 rounded-full bg-mobile-surface border border-mobile-border flex items-center justify-center text-mobile-secondaryText hover:text-mobile-primary active:scale-95 transition-all cursor-pointer"
            title={isPrivacyMode ? "Show balances" : "Hide balances"}
          >
            {isPrivacyMode ? (
              <EyeOff className="h-4 w-4 text-mobile-accent" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOTAL ACROSS ACCOUNTS HERO CARD
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-mobile-surface border border-mobile-border rounded-3xl p-5 shadow-xl space-y-2">
        <span className="text-[11px] text-mobile-secondaryText font-mono uppercase tracking-wider block">
          Total across accounts
        </span>
        <div className="text-3xl sm:text-4xl font-extrabold text-mobile-primary font-mono tabular-nums tracking-tight">
          {isPrivacyMode ? (
            "••••••••"
          ) : (
            `₹${totalAcrossAccounts.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          )}
        </div>
        <p className="text-xs text-mobile-secondaryText font-mono pt-0.5">
          A quick look at all your money in one place
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. YOUR ACCOUNTS LIST
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-mono font-bold text-mobile-secondaryText uppercase tracking-wider">
            Your accounts
          </h2>
          <span className="text-[10px] font-mono text-mobile-secondaryText">
            {activeAccounts.length} ACTIVE
          </span>
        </div>

        <div className="space-y-2">
          {activeAccounts.map((acc) => {
            const badge = getAccountBadge(acc.account_type);
            const bal = parseFloat(String(acc.current_balance || 0));
            const isCC = acc.account_type === "credit_card";

            return (
              <div
                key={acc.id}
                onClick={() => (onSelectAccount ? onSelectAccount(acc) : onOpenHistory ? onOpenHistory(acc) : undefined)}
                className="p-3.5 bg-mobile-surface border border-mobile-border rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:border-mobile-accent/40 active:bg-mobile-secondary transition-all shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border border-mobile-border",
                      badge.bg,
                      badge.text
                    )}
                  >
                    {badge.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-mobile-primary truncate">
                      {acc.name}
                    </p>
                    <p className="text-[10px] text-mobile-secondaryText font-mono truncate">
                      {acc.institution_name || badge.label}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={cn(
                      "font-mono font-bold tabular-nums text-xs",
                      isCC ? "text-mobile-expense" : "text-mobile-primary"
                    )}
                  >
                    {isCC && bal > 0 ? "-" : ""}
                    {isPrivacyMode ? "••••" : `₹${bal.toLocaleString("en-IN")}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. FLOATING BOTTOM ACTION BUTTONS
             ⇄ Transfer (outline) | + New account (solid accent)
      ────────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto grid grid-cols-2 gap-3 z-30">
        <button
          onClick={() => onOpenTransfer()}
          className="h-12 rounded-full border border-mobile-border bg-mobile-surface/95 backdrop-blur-md text-mobile-primary font-mono font-semibold text-xs flex items-center justify-center gap-2 hover:bg-mobile-secondary active:scale-95 transition-all shadow-xl cursor-pointer"
        >
          <ArrowLeftRight className="h-4 w-4 text-mobile-accent" />
          <span>Transfer</span>
        </button>

        <button
          onClick={onOpenCreateAccount}
          className="h-12 rounded-full bg-mobile-accent hover:bg-mobile-accent/90 text-background font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-mobile-accent/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>New account</span>
        </button>
      </div>
    </div>
  );
}
