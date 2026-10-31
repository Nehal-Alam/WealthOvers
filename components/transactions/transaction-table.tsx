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
import { deleteTransactionAction } from "@/app/(dashboard)/transactions/actions";

interface TransactionTableProps {
  transactions: any[];
  onEdit: (transaction: any) => void;
}

export function TransactionTable({ transactions, onEdit }: TransactionTableProps) {
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
          <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/20 gap-1 font-medium">
            <TrendingDown className="h-3 w-3" />
            <span>Expense</span>
          </Badge>
        );
      case "transfer":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20 gap-1 font-medium">
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
            const isPositive = txn.transaction_type === "income";

            return (
              <TableRow key={txn.id} className="hover:bg-muted/30">
                {/* Date */}
                <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(txn.transaction_date), "dd MMM yyyy")}
                </TableCell>

                {/* Type */}
                <TableCell>{getTypeBadge(txn.transaction_type)}</TableCell>

                {/* Description */}
                <TableCell>
                  <div className="font-medium text-sm text-foreground">
                    {txn.description}
                  </div>
                  {txn.reference_number && (
                    <div className="text-xs text-muted-foreground font-mono">
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
                    <span className="text-xs text-muted-foreground italic">
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
                      isNegative ? "text-rose-600 dark:text-rose-400" : ""
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
}

