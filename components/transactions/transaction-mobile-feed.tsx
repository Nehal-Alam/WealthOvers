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
import { deleteTransactionAction } from "@/app/(dashboard)/transactions/actions";

interface TransactionMobileFeedProps {
  transactions: any[];
  onEdit: (transaction: any) => void;
}

export function TransactionMobileFeed({
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "income":
        return <TrendingUp className="h-4 w-4 text-emerald-600" />;
      case "expense":
        return <TrendingDown className="h-4 w-4 text-rose-600" />;
      case "transfer":
        return <ArrowLeftRight className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {transactions.map((txn) => {
        const isNegative = txn.transaction_type === "expense";
        const isPositive = txn.transaction_type === "income";

        return (
          <Card key={txn.id} className="overflow-hidden border shadow-sm">
            <CardContent className="p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isPositive
                        ? "bg-emerald-500/10 text-emerald-600"
                        : isNegative
                        ? "bg-rose-500/10 text-rose-600"
                        : "bg-blue-500/10 text-blue-600"
                    }`}
                  >
                    {getTypeIcon(txn.transaction_type)}
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm leading-tight text-foreground">
                      {txn.description}
                    </h4>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap text-xs text-muted-foreground">
                      <span>{format(new Date(txn.transaction_date), "dd MMM")}</span>
                      <span>•</span>
                      <span>{txn.account?.name}</span>
                      {txn.category && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-foreground">
                            {txn.category.name}
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
                        isNegative ? "text-rose-600 dark:text-rose-400" : ""
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
}

