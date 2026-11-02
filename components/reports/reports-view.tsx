"use client";

import * as React from "react";
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  TrendingDown,
  TrendingUp,
  Landmark,
  Coins,
  Scale,
  CreditCard,
  Target,
  Layers,
  ArrowRight,
  ShieldCheck,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";
import {
  addMoney,
  subtractMoney,
  calculateSavingsRate,
  calculateNetWorth,
  getTransactionDisplayInfo,
} from "@/lib/calculations/financial";
import {
  DateDurationFilter,
  DATE_FILTER_OPTIONS,
  getDateRangeFromFilter,
  filterTransactionsByDateRange,
} from "@/lib/calculations/date-ranges";

export type ReportType =
  | "income"
  | "expense"
  | "monthly"
  | "annual"
  | "account"
  | "category"
  | "investment"
  | "net_worth"
  | "loan"
  | "credit_card"
  | "budget_vs_actual";

interface ReportsViewProps {
  transactions: any[];
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
  budgets?: any[];
  investments?: Tables<"investments">[];
  loans?: Tables<"loans">[];
  creditCards?: Tables<"credit_cards">[];
  assets?: Tables<"assets">[];
  liabilities?: Tables<"liabilities">[];
}

export function ReportsView({
  transactions,
  accounts,
  categories,
  budgets = [],
  investments = [],
  loans = [],
  creditCards = [],
  assets = [],
  liabilities = [],
}: ReportsViewProps) {
  const [selectedReport, setSelectedReport] = React.useState<ReportType>("income");
  const [selectedDuration, setSelectedDuration] = React.useState<DateDurationFilter>("financial_year");
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>("all");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("all");

  const dateRange = React.useMemo(() => {
    return getDateRangeFromFilter(selectedDuration);
  }, [selectedDuration]);

  // Filter transactions by duration, account, and category
  const filteredTransactions = React.useMemo(() => {
    let txns = filterTransactionsByDateRange(transactions, dateRange);

    if (selectedAccountId !== "all") {
      txns = txns.filter((t) => t.account_id === selectedAccountId);
    }
    if (selectedCategoryId !== "all") {
      txns = txns.filter((t) => t.category_id === selectedCategoryId);
    }

    return txns;
  }, [transactions, dateRange, selectedAccountId, selectedCategoryId]);

  // Aggregate Totals for active filtered transactions
  const { totalInflow, totalOutflow, netSavings, savingsRate } = React.useMemo(() => {
    let inc = "0.0000";
    let exp = "0.0000";

    for (const t of filteredTransactions) {
      const info = getTransactionDisplayInfo(t);
      if (info.direction === "inflow") {
        inc = addMoney(inc, t.amount);
      } else if (info.direction === "outflow") {
        exp = addMoney(exp, t.amount);
      }
    }

    const { netSavings: net, savingsRatePercent } = calculateSavingsRate(inc, exp);
    return {
      totalInflow: inc,
      totalOutflow: exp,
      netSavings: net,
      savingsRate: savingsRatePercent,
    };
  }, [filteredTransactions]);

  // Net worth calculation
  const netWorthData = React.useMemo(() => {
    return calculateNetWorth({
      accounts,
      investments,
      assets,
      loans,
      liabilities,
      creditCards,
    });
  }, [accounts, investments, assets, loans, liabilities, creditCards]);

  // CSV Export Generator
  const handleExportCSV = () => {
    let rows: string[][] = [];
    let filename = `wealthovers-${selectedReport}-report-${format(new Date(), "yyyy-MM-dd")}.csv`;

    if (selectedReport === "income" || selectedReport === "expense") {
      rows.push(["Date", "Description", "Category", "Account", "Type", "Amount", "Currency"]);
      const filtered = filteredTransactions.filter((t) =>
        selectedReport === "income"
          ? t.transaction_type === "income" || t.transaction_type === "refund"
          : t.transaction_type === "expense"
      );
      for (const t of filtered) {
        rows.push([
          t.transaction_date.slice(0, 10),
          `"${(t.description || "").replace(/"/g, '""')}"`,
          `"${t.category?.name || "Uncategorized"}"`,
          `"${t.account?.name || "N/A"}"`,
          t.transaction_type,
          t.amount,
          t.currency || "INR",
        ]);
      }
    } else if (selectedReport === "net_worth") {
      rows.push(["Item", "Classification", "Valuation / Amount", "Currency"]);
      rows.push(["Liquid Accounts", "Asset", netWorthData.assetsBreakdown.liquidAccounts, "INR"]);
      rows.push(["Investments", "Asset", netWorthData.assetsBreakdown.investments, "INR"]);
      rows.push(["Tangible Assets", "Asset", netWorthData.assetsBreakdown.tangibleAssets, "INR"]);
      rows.push(["Receivables (Money Lent)", "Asset", netWorthData.assetsBreakdown.receivables, "INR"]);
      rows.push(["Total Assets", "Gross Asset Total", netWorthData.totalAssets, "INR"]);
      rows.push(["Credit Card Dues", "Liability", netWorthData.liabilitiesBreakdown.creditCards, "INR"]);
      rows.push(["Loans & Mortgages", "Liability", netWorthData.liabilitiesBreakdown.loans, "INR"]);
      rows.push(["Borrowed Money", "Liability", netWorthData.liabilitiesBreakdown.borrowedMoney, "INR"]);
      rows.push(["Other Debts", "Liability", netWorthData.liabilitiesBreakdown.otherDebts, "INR"]);
      rows.push(["Total Liabilities", "Gross Liability Total", netWorthData.totalLiabilities, "INR"]);
      rows.push(["Total Net Worth", "Equity", netWorthData.netWorth, "INR"]);
    } else if (selectedReport === "investment") {
      rows.push(["Name", "Symbol", "Asset Type", "Broker", "Units", "Avg Buy Price", "Current Price", "Invested Amount", "Current Valuation"]);
      for (const inv of investments) {
        rows.push([
          `"${inv.name.replace(/"/g, '""')}"`,
          inv.symbol || "",
          inv.asset_type,
          inv.broker_name,
          String(inv.total_quantity),
          String(inv.average_buy_price),
          String(inv.current_nav_or_price),
          String(inv.total_invested_amount),
          String(inv.current_valuation),
        ]);
      }
    } else if (selectedReport === "loan") {
      rows.push(["Lender / Borrower", "Type", "Principal", "Outstanding Balance", "Interest Rate", "EMI", "Maturity Date"]);
      for (const l of loans) {
        rows.push([
          `"${l.lender_or_borrower_name.replace(/"/g, '""')}"`,
          l.loan_type,
          String(l.principal_amount),
          String(l.outstanding_balance),
          `${l.annual_interest_rate}%`,
          String(l.monthly_emi),
          l.maturity_date,
        ]);
      }
    } else {
      // Default: transactions export
      rows.push(["Date", "Description", "Category", "Account", "Type", "Amount", "Currency"]);
      for (const t of filteredTransactions) {
        rows.push([
          t.transaction_date.slice(0, 10),
          `"${(t.description || "").replace(/"/g, '""')}"`,
          `"${t.category?.name || "Uncategorized"}"`,
          `"${t.account?.name || "N/A"}"`,
          t.transaction_type,
          t.amount,
          t.currency || "INR",
        ]);
      }
    }

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const REPORT_MENU: Array<{ id: ReportType; label: string; icon: any }> = [
    { id: "income", label: "Income Report", icon: TrendingUp },
    { id: "expense", label: "Expense Report", icon: TrendingDown },
    { id: "monthly", label: "Monthly Financial Report", icon: Calendar },
    { id: "annual", label: "Annual Financial Report", icon: FileSpreadsheet },
    { id: "account", label: "Account-wise Report", icon: Landmark },
    { id: "category", label: "Category-wise Report", icon: Layers },
    { id: "investment", label: "Investment Report", icon: Coins },
    { id: "net_worth", label: "Net Worth Report", icon: Scale },
    { id: "loan", label: "Loan & Debt Report", icon: Scale },
    { id: "credit_card", label: "Credit Card Report", icon: CreditCard },
    { id: "budget_vs_actual", label: "Budget vs Actual", icon: Target },
  ];

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: TOP HEADER & CONTROLS
      ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            Financial Statements & Reports
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Audit-grade financial reporting, statement reconciliation, and CSV / PDF exports.
          </p>
        </div>

        {/* Global Export Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-1.5 border-border bg-surface text-text-primary hover:bg-surface-secondary text-xs rounded-xl"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-9 gap-1.5 border-border bg-surface text-text-primary hover:bg-surface-secondary text-xs rounded-xl"
          >
            <Printer className="h-3.5 w-3.5 text-text-secondary" />
            <span>Print PDF</span>
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: REPORT SELECTOR PILL TABS
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {REPORT_MENU.map((item) => {
          const Icon = item.icon;
          const isActive = selectedReport === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedReport(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-surface shadow-2xs"
                  : "bg-surface border border-border/80 text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: FILTER CONTROLS BAR (Date, Account, Category)
      ────────────────────────────────────────────────────────────── */}
      <div className="p-3 rounded-2xl border border-border/80 bg-surface flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-text-secondary flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </span>

          {/* Date Duration */}
          <Select
            value={selectedDuration}
            onValueChange={(val) => setSelectedDuration(val as DateDurationFilter)}
          >
            <SelectTrigger className="h-8 text-xs bg-surface-secondary/40 border-border rounded-lg min-w-[150px]">
              <Calendar className="h-3.5 w-3.5 mr-1 text-primary" />
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent className="bg-surface text-text-primary border-border">
              {DATE_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Account Filter */}
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="h-8 text-xs bg-surface-secondary/40 border-border rounded-lg min-w-[140px]">
              <Landmark className="h-3.5 w-3.5 mr-1 text-primary" />
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent className="bg-surface text-text-primary border-border">
              <SelectItem value="all" className="text-xs">All Accounts</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id} className="text-xs">
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger className="h-8 text-xs bg-surface-secondary/40 border-border rounded-lg min-w-[140px]">
              <Layers className="h-3.5 w-3.5 mr-1 text-primary" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-surface text-text-primary border-border">
              <SelectItem value="all" className="text-xs">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results summary tag */}
        <Badge variant="outline" className="text-xs font-mono py-0.5 px-2 bg-surface-secondary/50">
          {filteredTransactions.length} Records
        </Badge>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: ACTIVE REPORT CONTENT
      ────────────────────────────────────────────────────────────── */}
      {selectedReport === "income" && (
        <Card className="border border-border/80 bg-surface rounded-2xl shadow-2xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-text-primary">
                Income Statement Report
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary">
                Inflows, dividends, salaries, and interest for {dateRange.label}
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-secondary block">Total Income</span>
              <MoneyDisplay amount={totalInflow} className="text-lg font-bold text-success font-mono" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-secondary/60 text-text-secondary border-y border-border">
                  <tr>
                    <th className="py-2.5 px-4 text-left font-semibold">Date</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Description</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Category</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Account</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredTransactions
                    .filter((t) => t.transaction_type === "income" || t.transaction_type === "refund")
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-surface-secondary/30 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-text-secondary">
                          {format(new Date(t.transaction_date), "dd MMM yyyy")}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-text-primary">
                          {t.description || "Income Receipt"}
                        </td>
                        <td className="py-2.5 px-4 text-text-secondary">
                          {t.category?.name || "Income"}
                        </td>
                        <td className="py-2.5 px-4 text-text-secondary">
                          {t.account?.name || "N/A"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-success font-mono">
                          +<MoneyDisplay amount={t.amount} className="font-mono" />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedReport === "expense" && (
        <Card className="border border-border/80 bg-surface rounded-2xl shadow-2xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-text-primary">
                Expense Ledger Report
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary">
                Detailed spending distribution for {dateRange.label}
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-secondary block">Total Expenses</span>
              <MoneyDisplay amount={totalOutflow} className="text-lg font-bold text-danger font-mono" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-secondary/60 text-text-secondary border-y border-border">
                  <tr>
                    <th className="py-2.5 px-4 text-left font-semibold">Date</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Description</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Category</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Account</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredTransactions
                    .filter((t) => t.transaction_type === "expense")
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-surface-secondary/30 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-text-secondary">
                          {format(new Date(t.transaction_date), "dd MMM yyyy")}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-text-primary">
                          {t.description || "Expense Debit"}
                        </td>
                        <td className="py-2.5 px-4 text-text-secondary">
                          {t.category?.name || "General Expense"}
                        </td>
                        <td className="py-2.5 px-4 text-text-secondary">
                          {t.account?.name || "N/A"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-danger font-mono">
                          -<MoneyDisplay amount={t.amount} className="font-mono" />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedReport === "net_worth" && (
        <Card className="border border-border/80 bg-surface rounded-2xl shadow-2xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-text-primary">
                Consolidated Net Worth Statement
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary">
                Assets minus liabilities balance sheet
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-secondary block">Net Worth</span>
              <MoneyDisplay amount={netWorthData.netWorth} className="text-xl font-extrabold text-foreground font-mono" />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assets column */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-success uppercase tracking-wider">
                  Assets (+)
                </h4>
                <div className="space-y-2 text-xs divide-y divide-border/60">
                  <div className="flex justify-between py-1.5">
                    <span className="text-text-secondary">Liquid Accounts & Cash</span>
                    <MoneyDisplay amount={netWorthData.assetsBreakdown.liquidAccounts} className="font-mono font-semibold" />
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-text-secondary">Fixed Deposits & Savings</span>
                    <MoneyDisplay amount={netWorthData.assetsBreakdown.fixedDeposits} className="font-mono font-semibold" />
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-text-secondary">Investments (Stocks, MFs, Gold)</span>
                    <MoneyDisplay amount={netWorthData.assetsBreakdown.investments} className="font-mono font-semibold" />
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-text-secondary">Tangible Assets (Real estate, vehicles)</span>
                    <MoneyDisplay amount={netWorthData.assetsBreakdown.tangibleAssets} className="font-mono font-semibold" />
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-text-secondary">Receivables (Money Lent)</span>
                    <MoneyDisplay amount={netWorthData.assetsBreakdown.receivables} className="font-mono font-semibold" />
                  </div>
                  <div className="flex justify-between py-2 font-bold text-foreground">
                    <span>Total Gross Assets</span>
                    <MoneyDisplay amount={netWorthData.totalAssets} className="font-mono" />
                  </div>
                </div>
              </div>

              {/* Liabilities column */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-danger uppercase tracking-wider">
                  Liabilities (−)
                </h4>
                <div className="space-y-2 text-xs divide-y divide-border/60">
                  <div className="flex justify-between py-1.5">
                    <span className="text-text-secondary">Credit Card Outstanding</span>
                    <MoneyDisplay amount={netWorthData.liabilitiesBreakdown.creditCards} className="font-mono font-semibold text-danger" />
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-text-secondary">Loans & Mortgages</span>
                    <MoneyDisplay amount={netWorthData.liabilitiesBreakdown.loans} className="font-mono font-semibold text-danger" />
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-text-secondary">Borrowed Money</span>
                    <MoneyDisplay amount={netWorthData.liabilitiesBreakdown.borrowedMoney} className="font-mono font-semibold text-danger" />
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-text-secondary">Other External Debts</span>
                    <MoneyDisplay amount={netWorthData.liabilitiesBreakdown.otherDebts} className="font-mono font-semibold text-danger" />
                  </div>
                  <div className="flex justify-between py-2 font-bold text-danger">
                    <span>Total Gross Liabilities</span>
                    <MoneyDisplay amount={netWorthData.totalLiabilities} className="font-mono" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedReport === "investment" && (
        <Card className="border border-border/80 bg-surface rounded-2xl shadow-2xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-text-primary">
                Investment Portfolio Valuation Report
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary">
                Holding-wise buy price, units, and real-time market valuations
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-secondary block">Total Portfolio</span>
              <MoneyDisplay amount={netWorthData.assetsBreakdown.investments} className="text-lg font-bold text-foreground font-mono" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-secondary/60 text-text-secondary border-y border-border">
                  <tr>
                    <th className="py-2.5 px-4 text-left font-semibold">Asset Name</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Type</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Broker</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Units</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Avg Buy</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Current Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {investments.map((inv) => (
                    <tr key={inv.id} className="hover:bg-surface-secondary/30 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-text-primary">
                        {inv.name} {inv.symbol && <span className="text-text-secondary font-mono">({inv.symbol})</span>}
                      </td>
                      <td className="py-2.5 px-4 uppercase text-[10px] text-text-secondary">
                        {inv.asset_type}
                      </td>
                      <td className="py-2.5 px-4 text-text-secondary">
                        {inv.broker_name}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {inv.total_quantity}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        <MoneyDisplay amount={inv.average_buy_price} />
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold font-mono text-foreground">
                        <MoneyDisplay amount={inv.current_valuation} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedReport === "loan" && (
        <Card className="border border-border/80 bg-surface rounded-2xl shadow-2xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-text-primary">
                Loans, Debts & Receivables Report
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary">
                Outstanding balances, EMI commitments, and maturity dates
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-secondary block">Total Debt</span>
              <MoneyDisplay amount={netWorthData.liabilitiesBreakdown.loans} className="text-lg font-bold text-danger font-mono" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-secondary/60 text-text-secondary border-y border-border">
                  <tr>
                    <th className="py-2.5 px-4 text-left font-semibold">Lender / Borrower</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Classification</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Principal</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Outstanding</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Rate</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Monthly EMI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loans.map((l) => (
                    <tr key={l.id} className="hover:bg-surface-secondary/30 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-text-primary">
                        {l.lender_or_borrower_name}
                      </td>
                      <td className="py-2.5 px-4 text-text-secondary capitalize">
                        {l.loan_type === "loan_given" ? "Receivable (Lent)" : l.loan_type}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        <MoneyDisplay amount={l.principal_amount} />
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold font-mono text-danger">
                        <MoneyDisplay amount={l.outstanding_balance} />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {l.annual_interest_rate}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        <MoneyDisplay amount={l.monthly_emi} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedReport === "credit_card" && (
        <Card className="border border-border/80 bg-surface rounded-2xl shadow-2xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-text-primary">
                Credit Card Obligations Report
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary">
                Limits, outstanding balances, and utilization ratios
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-secondary/60 text-text-secondary border-y border-border">
                  <tr>
                    <th className="py-2.5 px-4 text-left font-semibold">Card Name</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Issuer</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Credit Limit</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Current Outstanding</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Available Limit</th>
                    <th className="py-2.5 px-4 text-center font-semibold">Due Day</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {creditCards.map((c) => {
                    const avail = subtractMoney(c.credit_limit, c.current_outstanding);
                    return (
                      <tr key={c.id} className="hover:bg-surface-secondary/30 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-text-primary">
                          {c.card_name} <span className="font-mono text-text-secondary">•••• {c.last_four_digits}</span>
                        </td>
                        <td className="py-2.5 px-4 text-text-secondary">
                          {c.issuer_name}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono">
                          <MoneyDisplay amount={c.credit_limit} />
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold font-mono text-danger">
                          <MoneyDisplay amount={c.current_outstanding} />
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-success font-semibold">
                          <MoneyDisplay amount={avail} />
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono">
                          {c.payment_due_day}th
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedReport === "budget_vs_actual" && (
        <Card className="border border-border/80 bg-surface rounded-2xl shadow-2xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-text-primary">
                Budget vs Actual Spending Report
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary">
                Envelope spending limits vs real expenditure
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-secondary/60 text-text-secondary border-y border-border">
                  <tr>
                    <th className="py-2.5 px-4 text-left font-semibold">Budget Name</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Period</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Limit</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Actual Spend</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Variance</th>
                    <th className="py-2.5 px-4 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {budgets.map((b) => {
                    const spent = b.totalSpent || "0";
                    const diff = subtractMoney(b.total_amount, spent);
                    const isOver = parseFloat(diff) < 0;
                    return (
                      <tr key={b.id} className="hover:bg-surface-secondary/30 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-text-primary">
                          {b.name}
                        </td>
                        <td className="py-2.5 px-4 text-text-secondary font-mono">
                          {b.start_date} – {b.end_date}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono">
                          <MoneyDisplay amount={b.total_amount} />
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold">
                          <MoneyDisplay amount={spent} />
                        </td>
                        <td className={`py-2.5 px-4 text-right font-mono font-bold ${isOver ? "text-danger" : "text-success"}`}>
                          <MoneyDisplay amount={diff} />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <Badge variant="outline" className={`text-[10px] ${isOver ? "border-danger text-danger bg-danger/10" : "border-success text-success bg-success/10"}`}>
                            {isOver ? "Over Budget" : "Within Limit"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {(selectedReport === "monthly" ||
        selectedReport === "annual" ||
        selectedReport === "account" ||
        selectedReport === "category") && (
        <Card className="border border-border/80 bg-surface rounded-2xl shadow-2xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-text-primary capitalize">
                {selectedReport.replace("_", " ")} Report
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary">
                Aggregated cash transactions for {dateRange.label}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-secondary/60 text-text-secondary border-y border-border">
                  <tr>
                    <th className="py-2.5 px-4 text-left font-semibold">Date</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Description</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Account</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Category</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredTransactions.slice(0, 50).map((t) => {
                    const isInc = t.transaction_type === "income" || t.transaction_type === "refund";
                    return (
                      <tr key={t.id} className="hover:bg-surface-secondary/30 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-text-secondary">
                          {format(new Date(t.transaction_date), "dd MMM yyyy")}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-text-primary">
                          {t.description || "Transaction"}
                        </td>
                        <td className="py-2.5 px-4 text-text-secondary">
                          {t.account?.name || "N/A"}
                        </td>
                        <td className="py-2.5 px-4 text-text-secondary">
                          {t.category?.name || "Uncategorized"}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-mono font-bold ${isInc ? "text-success" : "text-danger"}`}>
                          {isInc ? "+" : "-"}
                          <MoneyDisplay amount={t.amount} className="font-mono" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
