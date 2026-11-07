"use client";

import * as React from "react";
import {
  Wallet,
  Landmark,
  CreditCard,
  Coins,
  Building,
  Check,
  ChevronDown,
  Search,
  X,
  Layers,
} from "lucide-react";
import { Tables } from "@/types/database";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface AccountSelectorProps {
  accounts: Tables<"accounts">[];
  className?: string;
  variant?: "compact" | "badge" | "button";
}

function getAccountIcon(type: string) {
  switch (type) {
    case "savings":
    case "current":
    case "salary":
      return <Landmark className="h-4 w-4 shrink-0" />;
    case "cash":
    case "upi_wallet":
      return <Wallet className="h-4 w-4 shrink-0" />;
    case "credit_card":
      return <CreditCard className="h-4 w-4 shrink-0" />;
    case "investment_demat":
      return <Coins className="h-4 w-4 shrink-0" />;
    default:
      return <Building className="h-4 w-4 shrink-0" />;
  }
}

export function AccountSelector({
  accounts = [],
  className,
  variant = "compact",
}: AccountSelectorProps) {
  const { selectedAccountId, setSelectedAccountId, isPrivacyMode } = useUIStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const activeAccounts = React.useMemo(
    () => accounts.filter((a) => !a.is_archived),
    [accounts]
  );

  const selectedAccount = React.useMemo(() => {
    if (selectedAccountId === "all") return null;
    return activeAccounts.find((a) => a.id === selectedAccountId) || null;
  }, [selectedAccountId, activeAccounts]);

  const filteredAccounts = React.useMemo(() => {
    if (!searchQuery.trim()) return activeAccounts;
    const q = searchQuery.toLowerCase();
    return activeAccounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.institution_name && a.institution_name.toLowerCase().includes(q)) ||
        a.account_type.toLowerCase().includes(q)
    );
  }, [activeAccounts, searchQuery]);

  // Group accounts by type
  const cashAccounts = filteredAccounts.filter(
    (a) => a.account_type === "cash" || a.account_type === "upi_wallet"
  );
  const bankAccounts = filteredAccounts.filter(
    (a) =>
      a.account_type === "savings" ||
      a.account_type === "current" ||
      a.account_type === "salary"
  );
  const creditCards = filteredAccounts.filter(
    (a) => a.account_type === "credit_card"
  );
  const otherAccounts = filteredAccounts.filter(
    (a) =>
      a.account_type !== "cash" &&
      a.account_type !== "upi_wallet" &&
      a.account_type !== "savings" &&
      a.account_type !== "current" &&
      a.account_type !== "salary" &&
      a.account_type !== "credit_card"
  );

  const handleSelect = (id: string) => {
    setSelectedAccountId(id);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-mobile-border bg-mobile-surface hover:bg-mobile-secondary text-mobile-primary font-mono text-xs transition-all active:scale-95 cursor-pointer shadow-xs",
          className
        )}
        title="Filter by Account"
        aria-label="Account selector"
      >
        <div className="h-5 w-5 rounded-full bg-mobile-secondary flex items-center justify-center text-mobile-accent shrink-0">
          {selectedAccount ? (
            getAccountIcon(selectedAccount.account_type)
          ) : (
            <Layers className="h-3 w-3" />
          )}
        </div>
        <span className="font-semibold truncate max-w-[140px] sm:max-w-[200px]">
          {selectedAccount ? selectedAccount.name : "All Accounts"}
        </span>
        <ChevronDown className="h-3 w-3 text-mobile-secondaryText shrink-0" />
      </button>

      {/* Touch-Friendly Bottom Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl p-5 bg-mobile-surface border-t border-mobile-border text-mobile-primary max-w-md mx-auto max-h-[85vh] flex flex-col"
        >
          <SheetHeader className="pb-3 text-left flex flex-row items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-mobile-secondaryText uppercase tracking-wider block">
                Filter Ledger & Balances
              </span>
              <SheetTitle className="text-lg font-bold text-mobile-primary font-mono tracking-tight">
                Select Account
              </SheetTitle>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 rounded-full bg-mobile-secondary flex items-center justify-center text-mobile-secondaryText hover:text-mobile-primary"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </SheetHeader>

          {/* Search Bar when > 4 accounts */}
          {activeAccounts.length > 4 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-mobile-secondaryText" />
              <input
                type="text"
                placeholder="Search account by name or bank..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-mobile-secondary border border-mobile-border rounded-xl text-xs font-mono text-mobile-primary placeholder:text-mobile-secondaryText focus:outline-none focus:ring-1 focus:ring-mobile-accent"
              />
            </div>
          )}

          {/* Account Options List */}
          <div className="flex-1 overflow-y-auto space-y-3 py-1 pr-1 divide-y divide-mobile-border/40">
            {/* 1. All Accounts Option */}
            <div className="pt-1">
              <button
                onClick={() => handleSelect("all")}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer text-left",
                  selectedAccountId === "all"
                    ? "bg-mobile-secondary border-mobile-accent/50 shadow-xs"
                    : "bg-mobile-surface border-mobile-border/60 hover:bg-mobile-secondary/60"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-mobile-secondary border border-mobile-border flex items-center justify-center text-mobile-accent shrink-0">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-mobile-primary">
                      All Accounts
                    </p>
                    <p className="text-[10px] text-mobile-secondaryText font-mono">
                      Consolidated available balance & transactions
                    </p>
                  </div>
                </div>
                {selectedAccountId === "all" && (
                  <div className="h-6 w-6 rounded-full bg-mobile-accent/15 text-mobile-accent flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                )}
              </button>
            </div>

            {/* 2. Bank Accounts */}
            {bankAccounts.length > 0 && (
              <div className="pt-3 space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-mobile-secondaryText uppercase tracking-wider px-1">
                  Bank Accounts
                </span>
                {bankAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => handleSelect(acc.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer text-left",
                      selectedAccountId === acc.id
                        ? "bg-mobile-secondary border-mobile-accent/50 shadow-xs"
                        : "bg-mobile-surface border-mobile-border/60 hover:bg-mobile-secondary/60"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-mobile-secondary border border-mobile-border flex items-center justify-center text-mobile-accent shrink-0">
                        <Landmark className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-xs text-mobile-primary truncate">
                          {acc.name}
                        </p>
                        <p className="text-[10px] text-mobile-secondaryText font-mono truncate">
                          {acc.institution_name || "Bank"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold text-mobile-primary tabular-nums">
                        {isPrivacyMode
                          ? "••••"
                          : `₹${parseFloat(String(acc.current_balance || 0)).toLocaleString("en-IN")}`}
                      </span>
                      {selectedAccountId === acc.id && (
                        <div className="h-6 w-6 rounded-full bg-mobile-accent/15 text-mobile-accent flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 3. Cash / Wallets */}
            {cashAccounts.length > 0 && (
              <div className="pt-3 space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-mobile-secondaryText uppercase tracking-wider px-1">
                  Cash & Wallets
                </span>
                {cashAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => handleSelect(acc.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer text-left",
                      selectedAccountId === acc.id
                        ? "bg-mobile-secondary border-mobile-accent/50 shadow-xs"
                        : "bg-mobile-surface border-mobile-border/60 hover:bg-mobile-secondary/60"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-mobile-secondary border border-mobile-border flex items-center justify-center text-mobile-income shrink-0">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-xs text-mobile-primary truncate">
                          {acc.name}
                        </p>
                        <p className="text-[10px] text-mobile-secondaryText font-mono">
                          Physical Cash / Wallet
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold text-mobile-primary tabular-nums">
                        {isPrivacyMode
                          ? "••••"
                          : `₹${parseFloat(String(acc.current_balance || 0)).toLocaleString("en-IN")}`}
                      </span>
                      {selectedAccountId === acc.id && (
                        <div className="h-6 w-6 rounded-full bg-mobile-accent/15 text-mobile-accent flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 4. Credit Cards */}
            {creditCards.length > 0 && (
              <div className="pt-3 space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-mobile-secondaryText uppercase tracking-wider px-1">
                  Credit Cards
                </span>
                {creditCards.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => handleSelect(acc.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer text-left",
                      selectedAccountId === acc.id
                        ? "bg-mobile-secondary border-mobile-accent/50 shadow-xs"
                        : "bg-mobile-surface border-mobile-border/60 hover:bg-mobile-secondary/60"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-mobile-expense/15 border border-mobile-expense/30 flex items-center justify-center text-mobile-expense shrink-0">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-xs text-mobile-primary truncate">
                          {acc.name}
                        </p>
                        <p className="text-[10px] text-mobile-expense font-mono">
                          Credit Card Statement
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold text-mobile-expense tabular-nums">
                        {isPrivacyMode
                          ? "••••"
                          : `₹${parseFloat(String(acc.current_balance || 0)).toLocaleString("en-IN")}`}
                      </span>
                      {selectedAccountId === acc.id && (
                        <div className="h-6 w-6 rounded-full bg-mobile-accent/15 text-mobile-accent flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 5. Other Accounts (Investments, Demat, etc.) */}
            {otherAccounts.length > 0 && (
              <div className="pt-3 space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-mobile-secondaryText uppercase tracking-wider px-1">
                  Other Accounts
                </span>
                {otherAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => handleSelect(acc.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer text-left",
                      selectedAccountId === acc.id
                        ? "bg-mobile-secondary border-mobile-accent/50 shadow-xs"
                        : "bg-mobile-surface border-mobile-border/60 hover:bg-mobile-secondary/60"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-mobile-secondary border border-mobile-border flex items-center justify-center text-mobile-accent shrink-0">
                        {getAccountIcon(acc.account_type)}
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-xs text-mobile-primary truncate">
                          {acc.name}
                        </p>
                        <p className="text-[10px] text-mobile-secondaryText font-mono uppercase">
                          {acc.account_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold text-mobile-primary tabular-nums">
                        {isPrivacyMode
                          ? "••••"
                          : `₹${parseFloat(String(acc.current_balance || 0)).toLocaleString("en-IN")}`}
                      </span>
                      {selectedAccountId === acc.id && (
                        <div className="h-6 w-6 rounded-full bg-mobile-accent/15 text-mobile-accent flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
