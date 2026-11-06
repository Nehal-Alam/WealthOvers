"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/financial/money-display";
import { useUIStore } from "@/stores/ui-store";
import { Plus, ArrowUpRight, Calendar, Receipt, TrendingDown } from "lucide-react";

export interface CategoryDetailData {
  categoryId: string;
  categoryName: string;
  categoryColor?: string;
  categoryIcon?: string;
  allocatedAmount?: string | number | null;
  totalSpent: string | number;
  remaining?: string | number;
  percentage: number;
  isOverBudget: boolean;
  transactions: Array<{
    id: string;
    description: string;
    amount: number | string;
    transaction_date: string;
    account_name?: string;
    merchant_or_person?: string;
  }>;
}

interface CategoryDetailModalProps {
  data: CategoryDetailData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryDetailModal({
  data,
  open,
  onOpenChange,
}: CategoryDetailModalProps) {
  const { openQuickTransaction } = useUIStore();

  if (!data) return null;

  const handleAddExpenseForCategory = () => {
    onOpenChange(false);
    openQuickTransaction("expense");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-surface text-text-primary border-border p-5 rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className="h-4 w-4 rounded-full shrink-0"
                style={{ backgroundColor: data.categoryColor || "var(--primary)" }}
              />
              <DialogTitle className="text-xl font-bold tracking-tight text-text-primary">
                {data.categoryName}
              </DialogTitle>
            </div>
            <Badge
              variant={
                data.isOverBudget
                  ? "destructive"
                  : data.percentage >= 75
                  ? "secondary"
                  : "default"
              }
              className={
                data.isOverBudget
                  ? "bg-danger text-surface font-semibold"
                  : data.percentage >= 75
                  ? "bg-warning/20 text-warning font-semibold border-warning/30"
                  : "bg-success/20 text-success font-semibold border-success/30"
              }
            >
              {data.isOverBudget ? "Over Budget" : `${data.percentage}% Spent`}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-text-secondary">
            Category spending drilldown and transaction history for this period.
          </DialogDescription>
        </DialogHeader>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 py-3 border-y border-border/70 my-1">
          <div className="p-2.5 rounded-xl bg-surface-secondary/70 border border-border/50">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary block">
              Spent
            </span>
            <MoneyDisplay
              amount={data.totalSpent}
              className="text-sm font-bold text-text-primary mt-0.5"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-surface-secondary/70 border border-border/50">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary block">
              Budget Limit
            </span>
            {data.allocatedAmount ? (
              <MoneyDisplay
                amount={data.allocatedAmount}
                className="text-sm font-bold text-text-primary mt-0.5"
              />
            ) : (
              <span className="text-xs font-semibold text-text-secondary mt-0.5 block">
                Overall Cap
              </span>
            )}
          </div>

          <div className="p-2.5 rounded-xl bg-surface-secondary/70 border border-border/50">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary block">
              Remaining
            </span>
            {data.remaining !== undefined ? (
              <MoneyDisplay
                amount={data.remaining}
                className={`text-sm font-bold mt-0.5 ${
                  data.isOverBudget ? "text-danger" : "text-success"
                }`}
              />
            ) : (
              <span className="text-xs font-semibold text-text-secondary mt-0.5 block">
                —
              </span>
            )}
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary mb-2">
            <span>Transactions ({data.transactions.length})</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddExpenseForCategory}
              className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10 rounded-lg"
            >
              <Plus className="h-3 w-3" />
              <span>Add Expense</span>
            </Button>
          </div>

          {data.transactions.length === 0 ? (
            <div className="text-center py-8 rounded-xl border border-dashed border-border/70 text-text-secondary text-xs">
              <Receipt className="mx-auto h-8 w-8 text-text-secondary/40 mb-2" />
              <span>No transactions recorded for this category in this cycle.</span>
            </div>
          ) : (
            <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-surface overflow-hidden">
              {data.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 hover:bg-surface-secondary/50 transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-semibold text-text-primary truncate">
                      {tx.description || "Expense"}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-text-secondary mt-0.5">
                      <span>{format(new Date(tx.transaction_date), "dd MMM yyyy")}</span>
                      {tx.account_name && (
                        <>
                          <span>•</span>
                          <span>{tx.account_name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <MoneyDisplay
                      amount={tx.amount}
                      className="text-xs font-bold text-text-primary font-mono tabular-nums"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
