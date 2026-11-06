"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Building,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Scale,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MetricCard } from "@/components/financial/metric-card";
import { MoneyDisplay } from "@/components/financial/money-display";
import { Tables } from "@/types/database";
import { TransactionDetailModal } from "@/components/transactions/transaction-detail-modal";

interface AccountHistoryModalProps {
  account: Tables<"accounts"> | null;
  transactions: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountHistoryModal({
  account,
  transactions,
  open,
  onOpenChange,
}: AccountHistoryModalProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<"all" | "in" | "out">("all");
  const [selectedTxn, setSelectedTxn] = React.useState<any | null>(null);

  // 1. Filter transactions that touch this account (source or destination)
  const accountTxns = React.useMemo(() => {
    if (!account) return [];
    return transactions
      .filter((t) => t.account_id === account.id || t.destination_account_id === account.id)
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
  }, [transactions, account]);

  // 2. Compute accurate Running Balances from baseline
  // Running Balance = Previous Balance + Money In - Money Out
  const ledgerRows = React.useMemo(() => {
    if (!account) {
      return {
        rows: [],
        totalIn: 0,
        totalOut: 0,
        computedClosing: 0,
      };
    }
    let currentBalance = 0;
    let totalIn = 0;
    let totalOut = 0;

    const rows = accountTxns.map((txn) => {
      const amt = parseFloat(String(txn.amount || 0));
      const isDestination = txn.destination_account_id === account.id;
      const isSource = txn.account_id === account.id;

      let moneyIn = 0;
      let moneyOut = 0;

      if (txn.transaction_type === "income" || txn.transaction_type === "refund" || txn.transaction_type === "investment_sell" || txn.transaction_type === "lending_collection") {
        moneyIn = amt;
      } else if (txn.transaction_type === "expense" || txn.transaction_type === "bank_charges" || txn.transaction_type === "investment_buy" || txn.transaction_type === "sip" || txn.transaction_type === "lending" || txn.transaction_type === "credit_card_repayment" || txn.transaction_type === "borrowing_repayment" || txn.transaction_type === "loan_repayment") {
        moneyOut = amt;
      } else if (txn.transaction_type === "borrowing") {
        moneyIn = amt;
      } else if (txn.transaction_type === "transfer") {
        if (isDestination) {
          moneyIn = amt;
        } else if (isSource) {
          moneyOut = amt;
        }
      } else if (txn.transaction_type === "loan_disbursement") {
        if (txn.transaction_subtype === "lending") {
          moneyOut = amt;
        } else {
          moneyIn = amt;
        }
      } else {
        // Fallback: check ledger entry if available
        const accountEntry = txn.ledger_entries?.find((e: any) => e.account_id === account.id);
        if (accountEntry) {
          if (accountEntry.entry_type === "debit") moneyIn = amt;
          else moneyOut = amt;
        } else {
          moneyOut = amt;
        }
      }

      currentBalance = currentBalance + moneyIn - moneyOut;
      totalIn += moneyIn;
      totalOut += moneyOut;

      return {
        ...txn,
        moneyIn,
        moneyOut,
        runningBalance: currentBalance,
      };
    });

    return {
      rows,
      totalIn,
      totalOut,
      computedClosing: currentBalance,
    };
  }, [accountTxns, account]);

  // 3. Filter rows by search and direction
  const displayRows = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let filtered = ledgerRows.rows;

    if (filterType === "in") {
      filtered = filtered.filter((r) => r.moneyIn > 0);
    } else if (filterType === "out") {
      filtered = filtered.filter((r) => r.moneyOut > 0);
    }

    if (q) {
      filtered = filtered.filter(
        (r) =>
          r.description?.toLowerCase().includes(q) ||
          r.transaction_number?.toLowerCase().includes(q) ||
          r.category?.name?.toLowerCase().includes(q) ||
          r.merchant_or_person?.toLowerCase().includes(q)
      );
    }

    // Return descending for UI presentation (latest on top)
    return [...filtered].reverse();
  }, [ledgerRows.rows, filterType, searchQuery]);

  if (!account) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[780px] max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px] capitalize border-border/80 bg-surface-secondary/50">
                    {account.account_type.replace(/_/g, " ")}
                  </Badge>
                  {account.account_number_masked && (
                    <span className="text-xs font-mono text-muted-foreground">{account.account_number_masked}</span>
                  )}
                </div>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground mt-1 flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  <span>{account.name}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Complete running ledger and double-entry transaction history
                </DialogDescription>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] font-semibold text-muted-foreground block">Closing Balance</span>
                <span className="text-2xl font-mono font-bold tracking-tight text-foreground">
                  <MoneyDisplay amount={account.current_balance} currency={account.currency || "INR"} />
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* Metric KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-2">
            <MetricCard
              title="Total Inflow"
              amount={ledgerRows.totalIn}
              subtitle="Credits into account"
              icon={TrendingUp}
              iconColor="#244B3C"
            />
            <MetricCard
              title="Total Outflow"
              amount={ledgerRows.totalOut}
              subtitle="Debits from account"
              icon={TrendingDown}
              iconColor="#C77A65"
              coloredAmount={false}
            />
            <MetricCard
              title="Total Transactions"
              amount={ledgerRows.rows.length}
              formatType="count"
              subtitle="Ledger postings"
              icon={Receipt}
              iconColor="#244B3C"
            />
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search ledger entries..."
                className="pl-8 h-8 text-xs bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1 w-full sm:w-auto">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs flex-1 sm:flex-none"
                onClick={() => setFilterType("all")}
              >
                All ({ledgerRows.rows.length})
              </Button>
              <Button
                variant={filterType === "in" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs flex-1 sm:flex-none text-success"
                onClick={() => setFilterType("in")}
              >
                Money In
              </Button>
              <Button
                variant={filterType === "out" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs flex-1 sm:flex-none text-danger"
                onClick={() => setFilterType("out")}
              >
                Money Out
              </Button>
            </div>
          </div>

          {/* Running Balance Ledger Table */}
          <div className="space-y-2 pt-1">
            <div className="border border-border/80 rounded-xl overflow-hidden bg-card text-xs">
              <div className="grid grid-cols-12 py-2 px-3 bg-surface-secondary/70 text-[11px] font-bold text-muted-foreground border-b border-border/60">
                <span className="col-span-3">Date & Number</span>
                <span className="col-span-4">Description</span>
                <span className="col-span-2 text-right">In / Out</span>
                <span className="col-span-3 text-right">Running Balance</span>
              </div>

              {displayRows.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No transaction records found matching your filters.
                </div>
              ) : (
                <div className="divide-y divide-border/50 max-h-[380px] overflow-y-auto">
                  {displayRows.map((row) => {
                    const isCredit = row.moneyIn > 0;
                    const dateStr = row.transaction_date && !isNaN(new Date(row.transaction_date).getTime())
                      ? format(new Date(row.transaction_date), "dd MMM yyyy")
                      : "N/A";

                    return (
                      <div
                        key={row.id}
                        className="grid grid-cols-12 py-2.5 px-3 items-center hover:bg-surface-secondary/40 transition-colors cursor-pointer"
                        onClick={() => setSelectedTxn(row)}
                      >
                        <div className="col-span-3">
                          <span className="font-medium text-foreground block">{dateStr}</span>
                          <span className="font-mono text-[10px] text-muted-foreground block">
                            {row.transaction_number || `TXN-${row.id.slice(0, 6)}`}
                          </span>
                        </div>

                        <div className="col-span-4 pr-2">
                          <span className="font-semibold text-foreground truncate block">{row.description}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[9px] capitalize border-border">
                              {row.transaction_type.replace(/_/g, " ")}
                            </Badge>
                            {row.category?.name && (
                              <span className="text-[10px] text-muted-foreground truncate">{row.category.name}</span>
                            )}
                          </div>
                        </div>

                        <div className="col-span-2 text-right">
                          {isCredit ? (
                            <span className="font-mono font-bold text-success block">
                              +₹{row.moneyIn.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-danger block">
                              -₹{row.moneyOut.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>

                        <div className="col-span-3 text-right">
                          <span className="font-mono font-bold text-foreground block">
                            ₹{row.runningBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Drilldown to Transaction Detail */}
      <TransactionDetailModal
        transaction={selectedTxn}
        open={!!selectedTxn}
        onOpenChange={(isOpen) => !isOpen && setSelectedTxn(null)}
      />
    </>
  );
}
