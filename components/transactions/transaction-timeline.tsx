"use client";

import * as React from "react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import {
  TrendingDown,
  TrendingUp,
  ArrowLeftRight,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  Utensils,
  ShoppingCart,
  Car,
  ShoppingBag,
  Zap,
  HeartPulse,
  Plane,
  Briefcase,
  Tag,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { MoneyDisplay } from "@/components/financial/money-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteTransactionAction,
  markTransactionsReviewedAction,
} from "@/app/(dashboard)/transactions/actions";
import { addMoney, subtractMoney } from "@/lib/calculations/financial";

interface TransactionTimelineProps {
  transactions: any[];
  onEdit: (transaction: any) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

function getCategoryIcon(name: string) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("food") || lower.includes("dining") || lower.includes("restaurant")) {
    return <Utensils className="h-4 w-4" />;
  }
  if (lower.includes("grocer") || lower.includes("supermarket") || lower.includes("provision")) {
    return <ShoppingCart className="h-4 w-4" />;
  }
  if (lower.includes("transport") || lower.includes("fuel") || lower.includes("cab") || lower.includes("commute")) {
    return <Car className="h-4 w-4" />;
  }
  if (lower.includes("shop") || lower.includes("clothing") || lower.includes("electronics")) {
    return <ShoppingBag className="h-4 w-4" />;
  }
  if (lower.includes("bill") || lower.includes("utility") || lower.includes("electricity") || lower.includes("internet")) {
    return <Zap className="h-4 w-4" />;
  }
  if (lower.includes("health") || lower.includes("medical") || lower.includes("pharma")) {
    return <HeartPulse className="h-4 w-4" />;
  }
  if (lower.includes("travel") || lower.includes("flight") || lower.includes("hotel")) {
    return <Plane className="h-4 w-4" />;
  }
  if (lower.includes("salary") || lower.includes("wage") || lower.includes("income") || lower.includes("freelance")) {
    return <Briefcase className="h-4 w-4" />;
  }
  return <Tag className="h-4 w-4" />;
}

export const TransactionTimeline = React.memo(function TransactionTimeline({
  transactions,
  onEdit,
  selectedIds = new Set(),
  onToggleSelect,
}: TransactionTimelineProps) {
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction? Account balance will be restored.")) {
      return;
    }
    const res = await deleteTransactionAction(id);
    if (res.success) {
      toast.success(res.message || "Transaction deleted");
    } else {
      toast.error(res.error || "Failed to delete");
    }
  };

  const handleMarkReviewed = async (id: string) => {
    const res = await markTransactionsReviewedAction({ transaction_ids: [id] });
    if (res.success) {
      toast.success(res.message || "Marked as reviewed");
    } else {
      toast.error(res.error || "Failed to mark as reviewed");
    }
  };

  // Group transactions by date
  const groupedData = React.useMemo(() => {
    const groups: Array<{
      dateKey: string;
      displayDate: string;
      transactions: any[];
      totalExpense: string;
      totalIncome: string;
    }> = [];

    const map = new Map<string, any[]>();

    for (const txn of transactions) {
      const dateKey = txn.transaction_date ? txn.transaction_date.slice(0, 10) : "Undated";
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(txn);
    }

    map.forEach((txns, dateKey) => {
      let expenseSum = "0.0000";
      let incomeSum = "0.0000";

      for (const t of txns) {
        if (t.transaction_type === "expense") {
          expenseSum = addMoney(expenseSum, t.amount);
        } else if (t.transaction_type === "income" || t.transaction_type === "refund") {
          incomeSum = addMoney(incomeSum, t.amount);
        }
      }

      let displayDate = dateKey;
      try {
        const parsed = parseISO(dateKey);
        if (isToday(parsed)) {
          displayDate = `Today · ${format(parsed, "EEE, MMM d")}`;
        } else if (isYesterday(parsed)) {
          displayDate = `Yesterday · ${format(parsed, "EEE, MMM d")}`;
        } else {
          displayDate = format(parsed, "EEEE · MMM d, yyyy");
        }
      } catch {
        displayDate = dateKey;
      }

      groups.push({
        dateKey,
        displayDate,
        transactions: txns,
        totalExpense: expenseSum,
        totalIncome: incomeSum,
      });
    });

    return groups;
  }, [transactions]);

  return (
    <div className="space-y-6">
      {groupedData.map((group) => {
        const hasExpense = parseFloat(group.totalExpense) > 0;
        const hasIncome = parseFloat(group.totalIncome) > 0;

        return (
          <div key={group.dateKey} className="space-y-2">
            {/* Daily Date Header with Spending Summary */}
            <div className="flex items-center justify-between px-2 py-1 text-xs font-medium border-b border-border/60">
              <span className="text-text-primary font-semibold">{group.displayDate}</span>
              <div className="flex items-center gap-2 tabular-nums">
                {hasExpense && (
                  <span className="text-danger font-medium">
                    Spent -₹{parseFloat(group.totalExpense).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
                {hasIncome && (
                  <span className="text-success font-medium">
                    +₹{parseFloat(group.totalIncome).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
                {!hasExpense && !hasIncome && (
                  <span className="text-text-secondary">Transfer</span>
                )}
              </div>
            </div>

            {/* List of Transactions for this Date */}
            <div className="rounded-2xl border border-border/80 bg-surface divide-y divide-border/60 overflow-hidden shadow-2xs">
              {group.transactions.map((txn) => {
                const isExpense = txn.transaction_type === "expense";
                const isIncome = txn.transaction_type === "income" || txn.transaction_type === "refund";
                const isTransfer = txn.transaction_type === "transfer";
                const needsReview = txn.is_reviewed === false || !txn.category_id;
                const isSelected = selectedIds.has(txn.id);

                return (
                  <div
                    key={txn.id}
                    className={`flex items-center justify-between p-3.5 sm:px-4 transition-colors hover:bg-surface-secondary/40 ${
                      isSelected ? "bg-primary-soft/30" : ""
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* Checkbox for bulk actions */}
                      {onToggleSelect && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(txn.id)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer shrink-0"
                          aria-label={`Select ${txn.description}`}
                        />
                      )}

                      {/* Leftovers-style Category Icon Circle */}
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border border-border/60 transition-transform"
                        style={{
                          backgroundColor: txn.category?.color
                            ? `${txn.category.color}15`
                            : "var(--primary-soft)",
                          color: txn.category?.color || "var(--primary)",
                        }}
                      >
                        {getCategoryIcon(txn.category?.name || "")}
                      </div>

                      {/* Transaction Main Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-sm text-text-primary truncate">
                            {txn.description || "Untitled Transaction"}
                          </p>

                          {needsReview && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 rounded-full bg-warning/10 text-warning border-warning/30 font-medium shrink-0"
                            >
                              Needs Review
                            </Badge>
                          )}
                        </div>

                        {/* Subtitle: Category · Account · Destination Account */}
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5 truncate">
                          <span>{txn.category?.name || "Uncategorized"}</span>
                          {txn.subcategory?.name && (
                            <>
                              <span>›</span>
                              <span>{txn.subcategory.name}</span>
                            </>
                          )}
                          <span>·</span>
                          <span className="font-medium text-text-primary/80">
                            {txn.account?.name || "Account"}
                          </span>
                          {isTransfer && txn.destination_account?.name && (
                            <>
                              <span>→</span>
                              <span className="font-medium text-text-primary/80">
                                {txn.destination_account.name}
                              </span>
                            </>
                          )}
                          {txn.reference_number && (
                            <>
                              <span>·</span>
                              <span className="text-[11px] font-mono opacity-80">
                                {txn.reference_number}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side: Amount & Quick Actions Menu */}
                    <div className="flex items-center space-x-3 shrink-0 ml-3">
                      <div className="text-right">
                        <div className="flex items-baseline justify-end gap-0.5">
                          <span
                            className={`text-base font-bold tabular-nums tracking-tight ${
                              isExpense
                                ? "text-danger"
                                : isIncome
                                ? "text-success"
                                : "text-primary"
                            }`}
                          >
                            {isExpense ? "-" : isIncome ? "+" : "⇄ "}
                            ₹{parseFloat(txn.amount).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        {txn.notes && (
                          <span className="text-[11px] text-text-secondary max-w-[140px] truncate block text-right">
                            {txn.notes}
                          </span>
                        )}
                      </div>

                      {/* Dropdown Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-text-secondary hover:text-text-primary"
                            aria-label="Transaction actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 bg-surface text-text-primary border-border">
                          <DropdownMenuItem onClick={() => onEdit(txn)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            <span>Edit Transaction</span>
                          </DropdownMenuItem>
                          {needsReview && (
                            <DropdownMenuItem onClick={() => handleMarkReviewed(txn.id)}>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-success" />
                              <span>Mark Reviewed</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(txn.id)}
                            className="text-danger focus:text-danger"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});

