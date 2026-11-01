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
  Folder,
} from "lucide-react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface TransactionTableProps {
  transactions: any[];
  onEdit: (transaction: any) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  allSelected?: boolean;
}

export const TransactionTable = React.memo(function TransactionTable({
  transactions,
  onEdit,
  selectedIds = new Set(),
  onToggleSelect,
  onToggleSelectAll,
  allSelected = false,
}: TransactionTableProps) {
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "income":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 gap-1 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>Income</span>
          </Badge>
        );
      case "expense":
        return (
          <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 gap-1 font-medium">
            <TrendingDown className="h-3 w-3" />
            <span>Expense</span>
          </Badge>
        );
      case "refund":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 gap-1 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>Refund</span>
          </Badge>
        );
      case "transfer":
        return (
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 gap-1 font-medium">
            <ArrowLeftRight className="h-3 w-3" />
            <span>Transfer</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {onToggleSelectAll && (
              <TableHead className="w-[40px] px-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Select all transactions on page"
                  className="rounded border-border accent-primary cursor-pointer h-4 w-4"
                />
              </TableHead>
            )}
            <TableHead className="w-[110px]">Date</TableHead>
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead className="min-w-[180px]">Description</TableHead>
            <TableHead className="w-[150px]">Category</TableHead>
            <TableHead className="w-[150px]">Account</TableHead>
            <TableHead className="text-right w-[140px]">Amount</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((txn) => {
            const isNegative = txn.transaction_type === "expense";
            const isPositive = txn.transaction_type === "income" || txn.transaction_type === "refund";
            const isSelected = selectedIds.has(txn.id);
            const needsReview = txn.is_reviewed === false || !txn.category_id;

            return (
              <TableRow
                key={txn.id}
                className={`hover:bg-muted/30 transition-colors ${
                  isSelected ? "bg-primary/5 hover:bg-primary/10" : ""
                }`}
              >
                {/* Select Checkbox */}
                {onToggleSelect && (
                  <TableCell className="px-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(txn.id)}
                      aria-label={`Select ${txn.description}`}
                      className="rounded border-border accent-primary cursor-pointer h-4 w-4"
                    />
                  </TableCell>
                )}

                {/* Date */}
                <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(txn.transaction_date), "dd MMM yyyy")}
                </TableCell>

                {/* Type */}
                <TableCell>{getTypeBadge(txn.transaction_type)}</TableCell>

                {/* Description */}
                <TableCell>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm text-foreground">
                      {txn.description}
                    </span>
                    {needsReview && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 font-normal"
                      >
                        Needs Review
                      </Badge>
                    )}
                    {txn.tags &&
                      txn.tags.map((tag: string) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 font-normal"
                        >
                          {tag}
                        </Badge>
                      ))}
                  </div>
                  {txn.reference_number && (
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      Ref: {txn.reference_number}
                    </div>
                  )}
                </TableCell>

                {/* Category */}
                <TableCell>
                  {txn.category ? (
                    <div className="flex items-center space-x-1.5">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: txn.category.color || "#6B7280" }}
                      />
                      <span className="text-sm font-medium">
                        {txn.category.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600 dark:text-amber-400 italic font-medium">
                      Uncategorized
                    </span>
                  )}
                  {txn.subcategory && (
                    <span className="text-[11px] text-muted-foreground block">
                      ↳ {txn.subcategory.name}
                    </span>
                  )}
                </TableCell>

                {/* Account */}
                <TableCell>
                  <div className="text-sm font-medium">
                    {txn.account?.name || "Unknown"}
                  </div>
                  {txn.transaction_type === "transfer" && txn.destination_account && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>→</span> {txn.destination_account.name}
                    </div>
                  )}
                </TableCell>

                {/* Amount */}
                <TableCell className="text-right">
                  <MoneyDisplay
                    amount={txn.amount}
                    currency={txn.currency}
                    positiveSign={isPositive}
                    colored={isPositive || isNegative}
                    className={`font-semibold text-sm ${
                      isNegative ? "text-destructive" : ""
                    }`}
                  />
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        aria-label="Transaction options"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {needsReview && (
                        <DropdownMenuItem onClick={() => handleMarkReviewed(txn.id)}>
                          <span>Mark as Reviewed</span>
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
});

