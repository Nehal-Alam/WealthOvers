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
          <Badge className="bg-success/15 text-success hover:bg-success/20 border-success/30 gap-1 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>Income</span>
          </Badge>
        );
      case "expense":
        return (
          <Badge className="bg-danger/15 text-danger hover:bg-danger/20 border-danger/30 gap-1 font-medium">
            <TrendingDown className="h-3 w-3" />
            <span>Expense</span>
          </Badge>
        );
      case "refund":
        return (
          <Badge className="bg-success/15 text-success hover:bg-success/20 border-success/30 gap-1 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>Refund</span>
          </Badge>
        );
      case "transfer":
        return (
          <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-primary/30 gap-1 font-medium">
            <ArrowLeftRight className="h-3 w-3" />
            <span>Transfer</span>
          </Badge>
        );
      default:
        return <Badge variant="outline" className="border-border text-text-secondary">{type}</Badge>;
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-surface shadow-2xs overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-secondary/60 hover:bg-surface-secondary/70 border-border">
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
            <TableHead className="w-[110px] text-text-secondary font-medium text-xs">Date</TableHead>
            <TableHead className="w-[100px] text-text-secondary font-medium text-xs">Type</TableHead>
            <TableHead className="min-w-[180px] text-text-secondary font-medium text-xs">Description</TableHead>
            <TableHead className="w-[150px] text-text-secondary font-medium text-xs">Category</TableHead>
            <TableHead className="w-[150px] text-text-secondary font-medium text-xs">Account</TableHead>
            <TableHead className="text-right w-[140px] text-text-secondary font-medium text-xs">Amount</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border/60">
          {transactions.map((txn) => {
            const isNegative = txn.transaction_type === "expense";
            const isPositive = txn.transaction_type === "income" || txn.transaction_type === "refund";
            const isSelected = selectedIds.has(txn.id);
            const needsReview = txn.is_reviewed === false || !txn.category_id;

            return (
              <TableRow
                key={txn.id}
                className={`hover:bg-surface-secondary/40 transition-colors border-border/60 ${
                  isSelected ? "bg-primary-soft/30 hover:bg-primary-soft/40" : ""
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
                <TableCell className="font-mono text-xs text-text-secondary whitespace-nowrap">
                  {format(new Date(txn.transaction_date), "dd MMM yyyy")}
                </TableCell>

                {/* Type */}
                <TableCell>{getTypeBadge(txn.transaction_type)}</TableCell>

                {/* Description */}
                <TableCell>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm text-text-primary">
                      {txn.description}
                    </span>
                    {needsReview && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 text-warning border-warning/30 bg-warning/10 font-normal"
                      >
                        Needs Review
                      </Badge>
                    )}
                    {txn.tags &&
                      txn.tags.map((tag: string) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 font-normal bg-surface-secondary text-text-secondary"
                        >
                          {tag}
                        </Badge>
                      ))}
                  </div>
                  {txn.reference_number && (
                    <div className="text-xs text-text-secondary font-mono mt-0.5">
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
                        style={{ backgroundColor: txn.category.color || "var(--primary)" }}
                      />
                      <span className="text-sm font-medium text-text-primary">
                        {txn.category.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-warning italic font-medium">
                      Uncategorized
                    </span>
                  )}
                  {txn.subcategory && (
                    <span className="text-[11px] text-text-secondary block">
                      ↳ {txn.subcategory.name}
                    </span>
                  )}
                </TableCell>

                {/* Account */}
                <TableCell>
                  <div className="text-sm font-medium text-text-primary">
                    {txn.account?.name || "Unknown"}
                  </div>
                  {txn.transaction_type === "transfer" && txn.destination_account && (
                    <div className="text-xs text-text-secondary flex items-center gap-1">
                      <span>→</span> {txn.destination_account.name}
                    </div>
                  )}
                </TableCell>

                {/* Amount */}
                <TableCell className="text-right">
                  <span
                    className={`font-bold text-sm tabular-nums tracking-tight ${
                      isNegative ? "text-danger" : isPositive ? "text-success" : "text-primary"
                    }`}
                  >
                    {isNegative ? "- " : isPositive ? "+ " : "⇄ "}
                    ₹{parseFloat(txn.amount).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-text-secondary hover:text-text-primary"
                        aria-label="Transaction options"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-surface text-text-primary border-border">
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
                        className="text-danger focus:text-danger"
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
