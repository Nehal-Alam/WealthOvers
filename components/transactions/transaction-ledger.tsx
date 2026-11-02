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
  Download,
  CheckSquare,
  CheckCircle2,
  Trash2,
  AlertCircle,
  X,
  FileSpreadsheet,
} from "lucide-react";
import {
  isThisMonth,
  subMonths,
  subDays,
  startOfYear,
  isSameMonth,
  isAfter,
  isBefore,
  format,
} from "date-fns";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";

const CreateTransactionDialog = dynamic(
  () =>
    import("@/components/transactions/create-transaction-dialog").then(
      (m) => m.CreateTransactionDialog
    ),
  { ssr: false }
);

const EditTransactionDialog = dynamic(
  () =>
    import("@/components/transactions/edit-transaction-dialog").then(
      (m) => m.EditTransactionDialog
    ),
  { ssr: false }
);
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionMobileFeed } from "@/components/transactions/transaction-mobile-feed";
import { MetricCard } from "@/components/financial/metric-card";
import { addMoney, subtractMoney } from "@/lib/calculations/financial";
import {
  bulkUpdateCategoryAction,
  bulkDeleteTransactionsAction,
  markTransactionsReviewedAction,
} from "@/app/(dashboard)/transactions/actions";

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

  // Quick View Tab Filter: "all" | "needs_review" | "expense" | "income" | "transfer" | "refund"
  const [viewTab, setViewTab] = React.useState<string>("all");

  // Filters state
  const [searchQuery, setSearchQuery] = React.useState("");
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const [selectedType, setSelectedType] = React.useState<string>("all");
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>("all");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("all");
  const [dateFilter, setDateFilter] = React.useState<string>("all");
  const [customStartDate, setCustomStartDate] = React.useState<string>("");
  const [customEndDate, setCustomEndDate] = React.useState<string>("");

  // Multi-Selection State for Bulk Operations
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = React.useState<string>("none");
  const [isBulkOperating, setIsBulkOperating] = React.useState(false);

  // Pagination state (prevents DOM bloat and maintains 60 FPS interactions)
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 25;

  // Counts for Quick View Tabs
  const needsReviewCount = React.useMemo(() => {
    return transactions.filter((t) => t.is_reviewed === false || !t.category_id).length;
  }, [transactions]);

  // Reset to first page and clear selection when any filter criteria changes
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [
    viewTab,
    deferredSearchQuery,
    selectedType,
    selectedAccountId,
    selectedCategoryId,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  // Filtered transactions (uses deferredSearchQuery to keep input typing smooth)
  const filteredTransactions = React.useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    const now = new Date();
    const ninetyDaysAgo = subDays(now, 90);
    const startOfThisYear = startOfYear(now);

    return transactions.filter((txn) => {
      // 1. Quick View Tab Filter
      if (viewTab === "needs_review") {
        if (txn.is_reviewed !== false && txn.category_id) return false;
      } else if (viewTab === "expense") {
        if (txn.transaction_type !== "expense") return false;
      } else if (viewTab === "income") {
        if (txn.transaction_type !== "income") return false;
      } else if (viewTab === "transfer") {
        if (txn.transaction_type !== "transfer") return false;
      } else if (viewTab === "refund") {
        if (txn.transaction_type !== "refund") return false;
      }

      // 2. Search Query (matches description, ref, notes, merchant, tags)
      if (query) {
        const descMatch = txn.description?.toLowerCase().includes(query);
        const refMatch = txn.reference_number?.toLowerCase().includes(query);
        const notesMatch = txn.notes?.toLowerCase().includes(query);
        const tagMatch = txn.tags?.some((t: string) => t.toLowerCase().includes(query));
        const accountMatch = txn.account?.name?.toLowerCase().includes(query);
        const catMatch = txn.category?.name?.toLowerCase().includes(query);
        if (!descMatch && !refMatch && !notesMatch && !tagMatch && !accountMatch && !catMatch) {
          return false;
        }
      }

      // 3. Dropdown Type Filter (if not already handled by tab)
      if (selectedType !== "all" && txn.transaction_type !== selectedType) {
        return false;
      }

      // 4. Account Filter
      if (
        selectedAccountId !== "all" &&
        txn.account_id !== selectedAccountId &&
        txn.destination_account_id !== selectedAccountId
      ) {
        return false;
      }

      // 5. Category Filter
      if (selectedCategoryId !== "all" && txn.category_id !== selectedCategoryId) {
        return false;
      }

      // 6. Date Range Filter
      const txnDate = new Date(txn.transaction_date);
      if (dateFilter === "this_month") {
        if (!isThisMonth(txnDate)) return false;
      } else if (dateFilter === "last_month") {
        const lastMonthDate = subMonths(now, 1);
        if (!isSameMonth(txnDate, lastMonthDate)) return false;
      } else if (dateFilter === "last_90_days") {
        if (isBefore(txnDate, ninetyDaysAgo)) return false;
      } else if (dateFilter === "this_year") {
        if (isBefore(txnDate, startOfThisYear)) return false;
      } else if (dateFilter === "custom") {
        if (customStartDate && isBefore(txnDate, new Date(customStartDate))) return false;
        if (customEndDate && isAfter(txnDate, new Date(`${customEndDate}T23:59:59`))) return false;
      }

      return true;
    });
  }, [
    transactions,
    viewTab,
    deferredSearchQuery,
    selectedType,
    selectedAccountId,
    selectedCategoryId,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = React.useMemo(() => {
    const from = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(from, from + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allSelectedInPage =
    paginatedTransactions.length > 0 &&
    paginatedTransactions.every((t) => selectedIds.has(t.id));

  const handleToggleSelectAll = () => {
    const pageIds = paginatedTransactions.map((t) => t.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelectedInPage) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Bulk Operations
  const handleBulkCategoryChange = async (catId: string) => {
    if (selectedIds.size === 0) return;
    setIsBulkOperating(true);
    try {
      const res = await bulkUpdateCategoryAction({
        transaction_ids: Array.from(selectedIds),
        category_id: catId === "none" ? null : catId,
      });
      if (res.success) {
        toast.success(res.message);
        setSelectedIds(new Set());
      } else {
        toast.error(res.error || "Failed to update categories");
      }
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkMarkReviewed = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkOperating(true);
    try {
      const res = await markTransactionsReviewedAction({
        transaction_ids: Array.from(selectedIds),
      });
      if (res.success) {
        toast.success(res.message);
        setSelectedIds(new Set());
      } else {
        toast.error(res.error || "Failed to mark as reviewed");
      }
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.size} transaction(s)? Account balances will be automatically restored.`
      )
    ) {
      return;
    }
    setIsBulkOperating(true);
    try {
      const res = await bulkDeleteTransactionsAction({
        transaction_ids: Array.from(selectedIds),
      });
      if (res.success) {
        toast.success(res.message);
        setSelectedIds(new Set());
      } else {
        toast.error(res.error || "Failed to delete transactions");
      }
    } finally {
      setIsBulkOperating(false);
    }
  };

  // Export to CSV Functionality
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const headers = [
      "Date",
      "Type",
      "Description",
      "Category",
      "Subcategory",
      "Account",
      "Destination Account",
      "Amount",
      "Currency",
      "Reference Number",
      "Status",
      "Notes",
      "Tags",
    ];

    const escapeCSV = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredTransactions.map((t) => [
      escapeCSV(format(new Date(t.transaction_date), "yyyy-MM-dd")),
      escapeCSV(t.transaction_type),
      escapeCSV(t.description),
      escapeCSV(t.category?.name || "Uncategorized"),
      escapeCSV(t.subcategory?.name || ""),
      escapeCSV(t.account?.name || ""),
      escapeCSV(t.destination_account?.name || ""),
      escapeCSV(parseFloat(t.amount).toFixed(2)),
      escapeCSV(t.currency || "INR"),
      escapeCSV(t.reference_number || ""),
      escapeCSV(t.is_reviewed ? "Reviewed" : "Needs Review"),
      escapeCSV(t.notes || ""),
      escapeCSV(t.tags ? t.tags.join("; ") : ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `wealthovers_transactions_${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredTransactions.length} transactions to CSV`);
  };

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
            Complete real-time double-entry ledger with automatic account synchronization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 h-9"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
          <CreateTransactionDialog accounts={accounts} categories={categories} />
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Inflow"
          amount={totalInflow}
          subtitle={`${filteredTransactions.filter((t) => t.transaction_type === "income" || t.transaction_type === "refund").length} credit transactions`}
          icon={TrendingUp}
          iconColor="emerald"
          coloredAmount
        />
        <MetricCard
          title="Total Outflow"
          amount={totalOutflow}
          subtitle={`${filteredTransactions.filter((t) => t.transaction_type === "expense").length} debit transactions`}
          icon={TrendingDown}
          iconColor="coral"
          coloredAmount={false}
        />
        <MetricCard
          title="Net Cash Flow"
          amount={netCashFlow}
          subtitle="Net change across filtered period"
          icon={Receipt}
          iconColor="indigo"
          coloredAmount
        />
      </div>

      {/* Quick View Tabs (Monarch / Copilot Inspired) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b">
        <Button
          variant={viewTab === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setViewTab("all")}
          className="h-8 text-xs gap-1.5 rounded-lg shrink-0"
        >
          <span>All Transactions</span>
          <Badge
            variant={viewTab === "all" ? "outline" : "secondary"}
            className="text-[10px] px-1.5 py-0 h-4 rounded-full"
          >
            {transactions.length}
          </Badge>
        </Button>

        <Button
          variant={viewTab === "needs_review" ? "default" : "ghost"}
          size="sm"
          onClick={() => setViewTab("needs_review")}
          className={`h-8 text-xs gap-1.5 rounded-lg shrink-0 ${
            needsReviewCount > 0 && viewTab !== "needs_review"
              ? "text-amber-600 dark:text-amber-400 font-semibold"
              : ""
          }`}
        >
          <span className="flex items-center gap-1.5">
            {needsReviewCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            )}
            Needs Review
          </span>
          {needsReviewCount > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 rounded-full bg-amber-500/10 text-amber-600 border-amber-500/30"
            >
              {needsReviewCount}
            </Badge>
          )}
        </Button>

        <Button
          variant={viewTab === "expense" ? "default" : "ghost"}
          size="sm"
          onClick={() => setViewTab("expense")}
          className="h-8 text-xs gap-1.5 rounded-lg shrink-0"
        >
          <TrendingDown className="h-3 w-3 text-destructive" />
          <span>Expenses</span>
        </Button>

        <Button
          variant={viewTab === "income" ? "default" : "ghost"}
          size="sm"
          onClick={() => setViewTab("income")}
          className="h-8 text-xs gap-1.5 rounded-lg shrink-0"
        >
          <TrendingUp className="h-3 w-3 text-emerald-500" />
          <span>Income</span>
        </Button>

        <Button
          variant={viewTab === "transfer" ? "default" : "ghost"}
          size="sm"
          onClick={() => setViewTab("transfer")}
          className="h-8 text-xs gap-1.5 rounded-lg shrink-0"
        >
          <ArrowLeftRight className="h-3 w-3 text-blue-500" />
          <span>Transfers</span>
        </Button>

        <Button
          variant={viewTab === "refund" ? "default" : "ghost"}
          size="sm"
          onClick={() => setViewTab("refund")}
          className="h-8 text-xs gap-1.5 rounded-lg shrink-0"
        >
          <span>Refunds</span>
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="space-y-3 p-4 rounded-xl border bg-card shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Multi-Field Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search description, ref, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1 h-7 w-7 text-muted-foreground"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
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
              <SelectItem value="refund">Refund</SelectItem>
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
              <SelectItem value="last_90_days">Last 90 Days</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="custom">Custom Date Range...</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range Row (Shown when dateFilter === 'custom') */}
        {dateFilter === "custom" && (
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t">
            <span className="text-xs text-muted-foreground font-medium shrink-0">
              Custom Range:
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
                className="h-8 text-xs text-muted-foreground"
              >
                Clear Dates
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Floating Bulk Operations Toolbar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-6 z-20 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border bg-card/95 backdrop-blur-md shadow-xl border-primary/40 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">
              {selectedIds.size} transaction{selectedIds.size > 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Category Selector */}
            <Select value={bulkCategory} onValueChange={handleBulkCategoryChange} disabled={isBulkOperating}>
              <SelectTrigger className="h-8 text-xs w-[160px]">
                <SelectValue placeholder="Assign Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Mark Reviewed */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkMarkReviewed}
              disabled={isBulkOperating}
              className="h-8 text-xs gap-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Mark Reviewed</span>
            </Button>

            {/* Delete Selected */}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isBulkOperating}
              className="h-8 text-xs gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete ({selectedIds.size})</span>
            </Button>

            {/* Deselect All */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              disabled={isBulkOperating}
              className="h-8 text-xs text-muted-foreground"
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* Transaction Records */}
      {filteredTransactions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center bg-card">
          <Receipt className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold">No transactions match your criteria</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Try adjusting your filters, selecting a different date range, or record a new transaction.
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
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              allSelected={allSelectedInPage}
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
                Showing{" "}
                <span className="font-medium text-foreground">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-foreground">
                  {Math.min(currentPage * pageSize, filteredTransactions.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {filteredTransactions.length}
                </span>{" "}
                transactions
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
