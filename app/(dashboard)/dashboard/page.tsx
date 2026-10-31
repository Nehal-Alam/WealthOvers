import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  TrendingUp,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Landmark,
  Receipt,
  FileSpreadsheet,
  BarChart3,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/financial/metric-card";
import { MoneyDisplay } from "@/components/financial/money-display";
import type { Tables } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Fetch user accounts
  const { data: accountsData } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  const accounts = (accountsData as Tables<"accounts">[] | null) || [];

  // 2. Fetch user settings for default currency
  const { data: settingsData } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const settings = settingsData as Tables<"user_settings"> | null;
  const currency = settings?.currency || "INR";

  // 3. Fetch recent transactions
  const { data: transactionsData } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .limit(5);

  const recentTransactions = (transactionsData as Tables<"transactions">[] | null) || [];

  // Compute live aggregates from database
  let totalLiquid = 0;
  let totalCreditDebt = 0;

  for (const acc of accounts) {
    const bal = Number(acc.current_balance) || 0;
    if (acc.account_type === "credit_card" || acc.account_type === "loan_account") {
      totalCreditDebt += bal;
    } else {
      totalLiquid += bal;
    }
  }

  const netWorth = totalLiquid - totalCreditDebt;

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Financial Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time financial status and account overview
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="h-9">
            <Link href="/import">
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              Import Statement
            </Link>
          </Button>
          <Button asChild size="sm" className="h-9 shadow-sm">
            <Link href="/transactions">
              <Plus className="mr-1.5 h-4 w-4" />
              New Transaction
            </Link>
          </Button>
        </div>
      </div>

      {/* Top Financial KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Net Worth"
          amount={netWorth}
          currency={currency}
          icon={TrendingUp}
          iconColor="text-emerald-500 bg-emerald-500/10"
          subtitle="Assets minus liabilities"
        />
        <MetricCard
          title="Liquid Balance"
          amount={totalLiquid}
          currency={currency}
          icon={Wallet}
          iconColor="text-primary bg-primary/10"
          subtitle={`${accounts.length} active accounts`}
        />
        <MetricCard
          title="Credit & Liabilities"
          amount={totalCreditDebt}
          currency={currency}
          icon={ArrowDownRight}
          iconColor="text-rose-500 bg-rose-500/10"
          subtitle="Card outstanding & loans"
        />
        <MetricCard
          title="Monthly Cash Flow"
          amount={netWorth >= 0 ? netWorth : 0}
          currency={currency}
          icon={ArrowUpRight}
          iconColor="text-blue-500 bg-blue-500/10"
          subtitle="Current net liquidity"
        />
      </div>

      {/* Main Grid: Accounts & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts Overview Column (1/3) */}
        <Card className="lg:col-span-1 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Your Accounts
              </CardTitle>
              <CardDescription className="text-xs">
                Bank balances & credit cards
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
              <Link href="/accounts">
                View All
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.length > 0 ? (
              accounts.slice(0, 4).map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card/60 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 text-white font-semibold text-xs"
                      style={{ backgroundColor: acc.color }}
                    >
                      <Landmark className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium text-foreground truncate">
                        {acc.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {acc.institution_name} {acc.account_number_masked ? `• ${acc.account_number_masked}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <MoneyDisplay
                      amount={acc.current_balance}
                      currency={acc.currency}
                      className="text-sm font-semibold"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 px-4 rounded-lg border border-dashed">
                <Landmark className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-foreground">
                  No accounts linked
                </p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Add your bank accounts or cash to start tracking your net worth.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/accounts">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Account
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions Column (2/3) */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Recent Transactions
              </CardTitle>
              <CardDescription className="text-xs">
                Latest income, expenses and transfers
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
              <Link href="/transactions">
                View All
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="divide-y border rounded-lg overflow-hidden">
                {recentTransactions.map((tx) => {
                  const isExpense = tx.transaction_type === "expense";
                  const isIncome = tx.transaction_type === "income";

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isExpense
                              ? "bg-rose-500/10 text-rose-500"
                              : isIncome
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-blue-500/10 text-blue-500"
                          }`}
                        >
                          <Receipt className="h-4 w-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium text-foreground truncate">
                            {tx.description || "Transaction"}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {new Date(tx.transaction_date).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span>•</span>
                            <span className="capitalize">{tx.transaction_type}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-sm font-semibold font-mono ${
                            isExpense
                              ? "text-rose-600 dark:text-rose-400"
                              : isIncome
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-foreground"
                          }`}
                        >
                          {isExpense ? "-" : isIncome ? "+" : ""}
                          <MoneyDisplay
                            amount={tx.amount}
                            currency={tx.currency}
                          />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 px-4 rounded-lg border border-dashed">
                <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-foreground">
                  No transactions recorded
                </p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Record your expenses, income or import a bank statement.
                </p>
                <Button asChild size="sm">
                  <Link href="/transactions">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Record First Transaction
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          href="/reports"
          className="p-4 rounded-xl border bg-card/60 hover:bg-muted/60 transition-all flex flex-col items-center justify-center text-center group"
        >
          <BarChart3 className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-foreground">
            Financial Reports
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            Cash flow & spending
          </span>
        </Link>
        <Link
          href="/budgets"
          className="p-4 rounded-xl border bg-card/60 hover:bg-muted/60 transition-all flex flex-col items-center justify-center text-center group"
        >
          <TrendingUp className="h-6 w-6 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-foreground">
            Budgets
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            Category limits
          </span>
        </Link>
        <Link
          href="/import"
          className="p-4 rounded-xl border bg-card/60 hover:bg-muted/60 transition-all flex flex-col items-center justify-center text-center group"
        >
          <FileSpreadsheet className="h-6 w-6 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-foreground">
            Import Statements
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            CSV, Excel & PDF
          </span>
        </Link>
        <Link
          href="/devices"
          className="p-4 rounded-xl border bg-card/60 hover:bg-muted/60 transition-all flex flex-col items-center justify-center text-center group"
        >
          <Clock className="h-6 w-6 text-violet-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-foreground">
            Companion Sync
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            Android device status
          </span>
        </Link>
      </div>
    </div>
  );
}
