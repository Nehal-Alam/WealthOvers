"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ArrowLeftRight,
  Plus,
  Landmark,
  Wallet,
  CreditCard,
  Coins,
  Building,
  MoreVertical,
  History,
  Pencil,
  Eye,
  EyeOff,
} from "lucide-react";
import { Tables } from "@/types/database";
import { cn } from "@/lib/utils";
import Decimal from "decimal.js";
import { toDecimal } from "@/lib/calculations/financial";
import { useUIStore } from "@/stores/ui-store";

interface MobileAccountsViewProps {
  accounts: Tables<"accounts">[];
  onOpenTransfer: (acc?: Tables<"accounts">) => void;
  onOpenCreateAccount: () => void;
  onOpenHistory: (acc: Tables<"accounts">) => void;
  onOpenEdit: (acc: Tables<"accounts">) => void;
}

export function MobileAccountsView({
  accounts,
  onOpenTransfer,
  onOpenCreateAccount,
  onOpenHistory,
  onOpenEdit,
}: MobileAccountsViewProps) {
  const { isPrivacyMode, togglePrivacyMode } = useUIStore();

  const activeAccounts = React.useMemo(() => {
    return accounts.filter((a) => !a.is_archived);
  }, [accounts]);

  // Total across all active accounts
  const totalAcrossAccounts = React.useMemo(() => {
    let sum = new Decimal(0);
    for (const a of activeAccounts) {
      if (a.account_type === "credit_card" || a.account_type === "loan_account") {
        sum = sum.minus(toDecimal(a.current_balance || 0));
      } else {
        sum = sum.plus(toDecimal(a.current_balance || 0));
      }
    }
    return sum.toNumber();
  }, [activeAccounts]);

  // Categorize accounts matching Reference 6
  const { cashAccounts, bankAccounts, creditCardAccounts, investmentAccounts } =
    React.useMemo(() => {
      const cash: Tables<"accounts">[] = [];
      const banks: Tables<"accounts">[] = [];
      const cards: Tables<"accounts">[] = [];
      const invest: Tables<"accounts">[] = [];

      for (const a of activeAccounts) {
        if (["cash", "upi_wallet"].includes(a.account_type)) {
          cash.push(a);
        } else if (["savings", "salary", "current"].includes(a.account_type)) {
          banks.push(a);
        } else if (["credit_card", "loan_account"].includes(a.account_type)) {
          cards.push(a);
        } else {
          invest.push(a);
        }
      }

      return {
        cashAccounts: cash,
        bankAccounts: banks,
        creditCardAccounts: cards,
        investmentAccounts: invest,
      };
    }, [activeAccounts]);

  return (
    <div className="flex flex-col space-y-4 max-w-md mx-auto pb-28 text-[#F5F5F5] select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER WITH BACK BUTTON (Reference 6)
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 px-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-mono text-[#99999F] hover:text-[#F5F5F5] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-xl font-bold tracking-tight text-[#F5F5F5] font-mono">
            Accounts
          </span>
        </Link>

        <button
          onClick={togglePrivacyMode}
          className="h-9 w-9 rounded-full bg-[#151515] border border-[#303030] flex items-center justify-center text-[#99999F] hover:text-[#F5F5F5] active:scale-95 transition-all cursor-pointer"
          title={isPrivacyMode ? "Show balances" : "Hide balances"}
        >
          {isPrivacyMode ? <EyeOff className="h-4 w-4 text-[#A8C7FA]" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOTAL ACROSS ACCOUNTS HERO CARD (Reference 6)
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-[#151515] border border-[#303030] rounded-3xl p-5 shadow-xl space-y-2">
        <span className="text-[11px] text-[#99999F] font-mono uppercase tracking-wider block">
          Total across accounts
        </span>
        <div className="text-3xl sm:text-4xl font-extrabold text-[#F5F5F5] font-mono tabular-nums tracking-tight">
          {isPrivacyMode ? (
            "••••••••"
          ) : (
            `₹${totalAcrossAccounts.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          )}
        </div>
        <p className="text-xs text-[#99999F] font-mono pt-0.5">
          A quick look at all your money in one place
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. YOUR ACCOUNTS LIST (Reference 6)
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-mono font-bold text-[#99999F] uppercase tracking-wider">
            Your accounts
          </h2>
          <span className="text-[11px] font-mono text-[#99999F]">
            {activeAccounts.length} Active
          </span>
        </div>

        <div className="space-y-2">
          {/* CASH SECTION */}
          {cashAccounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() => onOpenHistory(acc)}
              className="p-3.5 bg-[#151515] border border-[#303030] rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:border-[#A8C7FA]/40 active:bg-[#202020] transition-all shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-[#80D5AE]/15 border border-[#80D5AE]/30 flex items-center justify-center text-[#80D5AE] shrink-0">
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-[#F5F5F5] truncate">{acc.name}</p>
                  <p className="text-[10px] text-[#99999F] font-mono truncate">
                    {acc.institution_name || "Default Cash Ledger"}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono font-bold text-xs text-[#F5F5F5] tabular-nums">
                  {isPrivacyMode ? "••••" : `₹${parseFloat(String(acc.current_balance || 0)).toLocaleString("en-IN")}`}
                </span>
              </div>
            </div>
          ))}

          {/* BANK ACCOUNTS SECTION */}
          {bankAccounts.map((acc) => {
            const bal = parseFloat(String(acc.current_balance || 0));
            const isNegative = bal < 0;

            return (
              <div
                key={acc.id}
                onClick={() => onOpenHistory(acc)}
                className="p-3.5 bg-[#151515] border border-[#303030] rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:border-[#A8C7FA]/40 active:bg-[#202020] transition-all shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-[#A8C7FA]/15 border border-[#A8C7FA]/30 flex items-center justify-center text-[#A8C7FA] shrink-0">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-[#F5F5F5] truncate">{acc.name}</p>
                    <p className="text-[10px] text-[#99999F] font-mono truncate">
                      {acc.institution_name || "Bank Account"}{" "}
                      {acc.account_number_masked ? `• ${acc.account_number_masked}` : ""}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={cn(
                      "font-mono font-bold text-xs tabular-nums",
                      isNegative ? "text-[#E58A91]" : "text-[#F5F5F5]"
                    )}
                  >
                    {isPrivacyMode ? "••••" : `${isNegative ? "-" : ""}₹${Math.abs(bal).toLocaleString("en-IN")}`}
                  </span>
                </div>
              </div>
            );
          })}

          {/* CREDIT CARDS SECTION */}
          {creditCardAccounts.map((acc) => {
            const bal = parseFloat(String(acc.current_balance || 0));

            return (
              <div
                key={acc.id}
                onClick={() => onOpenHistory(acc)}
                className="p-3.5 bg-[#151515] border border-[#303030] rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:border-[#E58A91]/40 active:bg-[#202020] transition-all shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-[#E58A91]/15 border border-[#E58A91]/30 flex items-center justify-center text-[#E58A91] shrink-0">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-[#F5F5F5] truncate">{acc.name}</p>
                    <p className="text-[10px] text-[#99999F] font-mono truncate">
                      {acc.institution_name || "Credit Card"}{" "}
                      {acc.account_number_masked ? `• ${acc.account_number_masked}` : ""}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-xs text-[#E58A91] tabular-nums">
                    {isPrivacyMode ? "••••" : `₹${bal.toLocaleString("en-IN")}`}
                  </span>
                </div>
              </div>
            );
          })}

          {/* INVESTMENTS & DEMAT SECTION */}
          {investmentAccounts.map((acc) => {
            const bal = parseFloat(String(acc.current_balance || 0));

            return (
              <div
                key={acc.id}
                onClick={() => onOpenHistory(acc)}
                className="p-3.5 bg-[#151515] border border-[#303030] rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:border-[#83D4B3]/40 active:bg-[#202020] transition-all shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-[#83D4B3]/15 border border-[#83D4B3]/30 flex items-center justify-center text-[#83D4B3] shrink-0">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-[#F5F5F5] truncate">{acc.name}</p>
                    <p className="text-[10px] text-[#99999F] font-mono truncate">
                      {acc.institution_name || "Investment / Demat"}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-xs text-[#80D5AE] tabular-nums">
                    {isPrivacyMode ? "••••" : `₹${bal.toLocaleString("en-IN")}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. FLOATING BOTTOM ACTION BUTTONS (Reference 6)
             ⇄ Transfer (outline) | + New account (solid #A8C7FA)
      ────────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto grid grid-cols-2 gap-3 z-30">
        <button
          onClick={() => onOpenTransfer()}
          className="h-12 rounded-full border border-[#303030] bg-[#151515]/95 backdrop-blur-md text-[#F5F5F5] font-mono font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#202020] active:scale-95 transition-all shadow-xl cursor-pointer"
        >
          <ArrowLeftRight className="h-4 w-4 text-[#A8C7FA]" />
          <span>Transfer</span>
        </button>

        <button
          onClick={onOpenCreateAccount}
          className="h-12 rounded-full bg-[#A8C7FA] hover:bg-[#A8C7FA]/90 text-[#050505] font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-[#A8C7FA]/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>New account</span>
        </button>
      </div>
    </div>
  );
}
