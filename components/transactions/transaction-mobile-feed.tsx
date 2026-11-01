"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  TrendingDown,
  TrendingUp,
  ArrowLeftRight,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoneyDisplay } from "@/components/financial/money-display";
import {
  deleteTransactionAction,
  markTransactionsReviewedAction,
} from "@/app/(dashboard)/transactions/actions";

interface TransactionMobileFeedProps {
  transactions: any[];
  onEdit: (transaction: any) => void;
}

export const TransactionMobileFeed = React.memo(function TransactionMobileFeed({
  transactions,
  onEdit,
}: TransactionMobileFeedProps) {
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction? Account balance will be restored.")) {
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "income":
      case "refund":
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case "expense":
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case "transfer":
        return <ArrowLeftRight className="h-4 w-4 text-primary" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {transactions.map((txn) => {
        const isNegative = txn.transaction_type === "expense";
        const isPositive = txn.transaction_type === "income" || txn.transaction_type === "refund";
        const needsReview = txn.is_reviewed === false || !txn.category_id;

        return (
          <Card key={txn.id} className="overflow-hidden border border-border/80 bg-card shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isPositive
                        ? "bg-emerald-500/10 text-emerald-500"
                        : isNegative
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {getTypeIcon(txn.transaction_type)}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-semibold text-sm leading-tight text-foreground">
                        {txn.description}
                      </h4>
                      {needsReview && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10"
                        >
                          Review
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap text-xs text-muted-foreground">
                      <span>{format(new Date(txn.transaction_date), "dd MMM")}</span>
                      <span>•</span>
                      <span>{txn.account?.name}</span>
                      {txn.category ? (
                        <>
                          <span>•</span>
                          <span className="font-medium text-foreground">
                            {txn.category.name}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 dark:text-amber-400 italic">
                            Uncategorized
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <div className="text-right">
                    <MoneyDisplay
                      amount={txn.amount}
                      currency={txn.currency}
                      positiveSign={isPositive}
                      colored={isPositive || isNegative}
                      className={`font-bold text-sm ${
                        isNegative ? "text-destructive" : ""
                      }`}
                    />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground -mr-1"
                        aria-label="Transaction options"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {needsReview && (
                        <DropdownMenuItem onClick={() => handleMarkReviewed(txn.id)}>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                          <span>Mark Reviewed</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onEdit(txn)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(txn.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

