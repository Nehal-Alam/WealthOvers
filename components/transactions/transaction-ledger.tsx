"use client";

import * as React from "react";
import {
  Receipt,
  Search,
  Filter,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  ArrowLeftRight,
  Calendar,
} from "lucide-react";
import { isThisMonth, subMonths, isSameMonth } from "date-fns";

import { Tables } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateTransactionDialog } from "@/components/transactions/create-transaction-dialog";
import { EditTransactionDialog } from "@/components/transactions/edit-transaction-dialog";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionMobileFeed } from "@/components/transactions/transaction-mobile-feed";
import { MetricCard } from "@/components/financial/metric-card";
import { addMoney, subtractMoney } from "@/lib/calculations/financial";

interface TransactionLedgerProps {
  transactions: any[];
  accounts: Tables<"accounts">[];
  categories: (Tables<"categories"> & { subcategories?: Tables<"subcategories">[] })[];
}

export function TransactionLedger({
  transactions,
  accounts,
  categories,
}: TransactionLedgerProps) {
  const [editingTransaction, setEditingTransaction] = React.useState<any | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = React.useState("");
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const [selectedType, setSelectedType] = React.useState<string>("all");
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>("all");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("all");
  const [dateFilter, setDateFilter] = React.useState<string>("all");

  // Pagination state (prevents DOM bloat and maintains 60 FPS interactions)
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 25;

  // Reset to first page when any filter criteria changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchQuery, selectedType, selectedAccountId, selectedCategoryId, dateFilter]);

  // Filtered transactions (uses deferredSearchQuery to keep input typing smooth)
  const filteredTransactions = React.useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    return transactions.filter((txn) => {
      // Search
      if (query) {
        const descMatch = txn.description?.toLowerCase().includes(query);
        const refMatch = txn.reference_number?.toLowerCase().includes(query);
        const notesMatch = txn.notes?.toLowerCase().includes(query);
        if (!descMatch && !refMatch && !notesMatch) return false;
      }

      // Type
      if (selectedType !== "all" && txn.transaction_type !== selectedType) {
        return false;
      }

      // Account
      if (
        selectedAccountId !== "all" &&
        txn.account_id !== selectedAccountId &&
        txn.destination_account_id !== selectedAccountId
      ) {
        return false;
      }

      // Category
      if (selectedCategoryId !== "all" && txn.category_id !== selectedCategoryId) {
        return false;
      }

      // Date Range
      if (dateFilter === "this_month") {
        if (!isThisMonth(new Date(txn.transaction_date))) return false;
      } else if (dateFilter === "last_month") {
        const lastMonthDate = subMonths(new Date(), 1);
        if (!isSameMonth(new Date(txn.transaction_date), lastMonthDate)) return false;
      }

      return true;
    });
  }, [
    transactions,
    deferredSearchQuery,
    selectedType,
    selectedAccountId,
    selectedCategoryId,
    dateFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = React.useMemo(() => {
    const from = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(from, from + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Aggregate Metrics using Decimal precision
  const { totalInflow, totalOutflow, netCashFlow } = React.useMemo(() => {
    let inflow = "0.0000";
    let outflow = "0.0000";

    for (const txn of filteredTransactions) {
      if (txn.transaction_type === "income" || txn.transaction_type === "refund") {
        inflow = addMoney(inflow, txn.amount);
      } else if (txn.transaction_type === "expense") {
        outflow = addMoney(outflow, txn.amount);
      }
      // Note: transfers are excluded from net cashflow (net zero)
    }

    const net = subtractMoney(inflow, outflow);
    return { totalInflow: inflow, totalOutflow: outflow, netCashFlow: net };
  }, [filteredTransactions]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Transaction Ledger</h2>
          <p className="text-sm text-muted-foreground">
            Complete real-time ledger with double-entry balance synchronization.
          </p>
        </div>
        <CreateTransactionDialog accounts={accounts} categories={categories} />
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Inflow"
          amount={totalInflow}
          subtitle={`${filteredTransactions.filter((t) => t.transaction_type === "income").length} credit transactions`}
          icon={TrendingUp}
          iconColor="#10B981"
          coloredAmount
        />
        <MetricCard
          title="Total Outflow"
          amount={totalOutflow}
          subtitle={`${filteredTransactions.filter((t) => t.transaction_type === "expense").length} debit transactions`}
          icon={TrendingDown}
          iconColor="#EF4444"
          coloredAmount={false}
        />
        <MetricCard
          title="Net Cash Flow"
          amount={netCashFlow}
          subtitle="Net change across filtered period"
          icon={Receipt}
          iconColor="#3B82F6"
          coloredAmount
        />
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-xl border bg-card shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search description, ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* Type Filter */}
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>

        {/* Account Filter */}
        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Filter */}
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transaction Records */}
      {filteredTransactions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center bg-card">
          <Receipt className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold">No transactions match your criteria</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Try adjusting your filters or record a new transaction.
          </p>
          <CreateTransactionDialog accounts={accounts} categories={categories} />
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <TransactionTable
              transactions={paginatedTransactions}
              onEdit={setEditingTransaction}
            />
          </div>

          {/* Mobile Feed View */}
          <div className="md:hidden">
            <TransactionMobileFeed
              transactions={paginatedTransactions}
              onEdit={setEditingTransaction}
            />
          </div>

          {/* Pagination Controls */}
          {filteredTransactions.length > pageSize && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-sm text-muted-foreground">
              <p>
                Showing <span className="font-medium text-foreground">{((currentPage - 1) * pageSize) + 1}</span> to{" "}
                <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, filteredTransactions.length)}</span> of{" "}
                <span className="font-medium text-foreground">{filteredTransactions.length}</span> transactions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-3 text-xs"
                >
                  Previous
                </Button>
                <span className="text-xs font-medium px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-3 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Transaction Modal */}
      <EditTransactionDialog
        transaction={editingTransaction}
        accounts={accounts}
        categories={categories}
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
      />
    </div>
  );
}

