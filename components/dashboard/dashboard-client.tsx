"use client";

import * as React from "react";
import Link from "next/link";
import { format, isThisMonth } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  CreditCard,
  Receipt,
  PiggyBank,
  Calendar,
  PlusCircle,
  ArrowLeftRight,
  ChevronRight,
  AlertTriangle,
  Percent,
} from "lucide-react";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/financial/metric-card";
import { MoneyDisplay } from "@/components/financial/money-display";
import { CreateTransactionDialog } from "@/components/transactions/create-transaction-dialog";
import { TransferFundsDialog } from "@/components/accounts/transfer-funds-dialog";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import {
  addMoney,
  subtractMoney,
  calculateSavingsRate,
  calculateBudgetUtilization,
} from "@/lib/calculations/financial";

interface DashboardClientProps {
  accounts: Tables<"accounts">[];
  recentTransactions: any[];
  categories: Tables<"categories">[];
  activeBudget?: any | null;
  upcomingRecurring?: any[];
}

export function DashboardClient({
  accounts,
  recentTransactions,
  categories,
  activeBudget,
  upcomingRecurring = [],
}: DashboardClientProps) {
  const activeAccounts = React.useMemo(
    () => accounts.filter((a) => !a.is_archived),
    [accounts]
  );

  // Financial calculations with Decimal precision
  const { totalLiquid, totalCredit, netWorth, monthlyInflow, monthlyOutflow, savingsRate } =
    React.useMemo(() => {
      let liquid = "0.0000";
      let credit = "0.0000";

      for (const a of activeAccounts) {
        if (a.account_type === "credit_card" || a.account_type === "loan_account") {
          credit = addMoney(credit, a.current_balance);
        } else {
          liquid = addMoney(liquid, a.current_balance);
        }
      }

      const nw = subtractMoney(liquid, credit);

      let inflow = "0.0000";
      let outflow = "0.0000";

      for (const t of recentTransactions) {
        if (isThisMonth(new Date(t.transaction_date))) {
          if (t.transaction_type === "income" || t.transaction_type === "refund") {
            inflow = addMoney(inflow, t.amount);
          } else if (t.transaction_type === "expense") {
            outflow = addMoney(outflow, t.amount);
          }
        }
      }

      const { savingsRatePercent } = calculateSavingsRate(inflow, outflow);

      return {
        totalLiquid: liquid,
        totalCredit: credit,
        netWorth: nw,
        monthlyInflow: inflow,
        monthlyOutflow: outflow,
        savingsRate: savingsRatePercent,
      };
    }, [activeAccounts, recentTransactions]);

  // Budget calculations
  const budgetUtilization = React.useMemo(() => {
    if (!activeBudget) return null;
    return calculateBudgetUtilization(
      activeBudget.total_amount,
      activeBudget.totalSpent || "0.0000"
    );
  }, [activeBudget]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Financial Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time multi-account overview and cash flow position
          </p>
        </div>

        {/* Quick Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeAccounts.length >= 2 && (
            <TransferFundsDialog
              accounts={accounts}
              trigger={
                <Button size="sm" variant="outline" className="gap-1.5 h-9">
                  <ArrowLeftRight className="h-4 w-4" />
                  <span>Transfer</span>
                </Button>
              }
            />
          )}

          <CreateTransactionDialog
            accounts={accounts}
            categories={categories}
            defaultType="income"
            trigger={
              <Button size="sm" variant="outline" className="gap-1.5 h-9 text-emerald-600 hover:text-emerald-700">
                <TrendingUp className="h-4 w-4" />
                <span>Add Income</span>
              </Button>
            }
          />

          <CreateTransactionDialog
            accounts={accounts}
            categories={categories}
            defaultType="expense"
            trigger={
              <Button size="sm" className="gap-1.5 h-9 bg-rose-600 hover:bg-rose-700 text-white shadow-sm">
                <TrendingDown className="h-4 w-4" />
                <span>Add Expense</span>
              </Button>
            }
          />
        </div>
      </div>

      {/* Top Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Net Liquid Position"
          amount={netWorth}
          subtitle="Liquid assets minus credit obligations"
          icon={Wallet}
          iconColor="#3B82F6"
          coloredAmount
        />
        <MetricCard
          title="Liquid Capital"
          amount={totalLiquid}
          subtitle="Bank & cash balances"
          icon={Landmark}
          iconColor="#10B981"
        />
        <MetricCard
          title="Total Liabilities"
          amount={totalCredit}
          subtitle="Credit cards & loans"
          icon={CreditCard}
          iconColor="#EF4444"
          coloredAmount={false}
        />
        <MetricCard
          title="This Month's Savings"
          amount={`${savingsRate}%`}
          subtitle={`Inflow: ₹${parseFloat(monthlyInflow).toLocaleString()} | Outflow: ₹${parseFloat(monthlyOutflow).toLocaleString()}`}
          icon={Percent}
          iconColor="#8B5CF6"
        />
      </div>

      {/* Active Budget Alert / Progress Widget (if active budget exists) */}
      {activeBudget && budgetUtilization && (
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <PiggyBank className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">
                  {activeBudget.name} Progress
                </h3>
              </div>
              <span
                className={`text-xs font-mono font-bold ${
                  budgetUtilization.isOverBudget
                    ? "text-rose-600"
                    : budgetUtilization.percentage >= 85
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}
              >
                {budgetUtilization.percentage}% used
              </span>
            </div>

            <Progress
              value={Math.min(budgetUtilization.percentage, 100)}
              indicatorClassName={
                budgetUtilization.isOverBudget
                  ? "bg-rose-500"
                  : budgetUtilization.percentage >= 85
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }
              className="h-2"
            />

            <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
              <span>
                Spent: <MoneyDisplay amount={activeBudget.totalSpent || "0"} />
              </span>
              <span>
                Limit: <MoneyDisplay amount={activeBudget.total_amount} />
              </span>
              <Button asChild variant="link" className="p-0 h-auto text-xs">
                <Link href="/budgets">Manage Budgets →</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Grid: Accounts Overview & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounts Card */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Your Accounts
              </CardTitle>
              <CardDescription>
                Balances across connected institutions
              </CardDescription>
            </div>
            <CreateAccountDialog
              trigger={
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>New</span>
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {activeAccounts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No accounts found</p>
                <div className="mt-3">
                  <CreateAccountDialog />
                </div>
              </div>
            ) : (
              <>
                {activeAccounts.slice(0, 4).map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-card/60 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: acc.color || "#3B82F6" }}
                      />
                      <div>
                        <p className="font-semibold text-sm leading-tight">
                          {acc.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {acc.institution_name}
                          {acc.account_number_masked && (
                            <span className="ml-1.5 font-mono">
                              {acc.account_number_masked}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <MoneyDisplay
                      amount={acc.current_balance}
                      currency={acc.currency}
                      className="text-sm font-bold"
                    />
                  </div>
                ))}

                <div className="pt-2 text-center">
                  <Button asChild variant="outline" size="sm" className="w-full text-xs">
                    <Link href="/accounts">
                      <span>View All Accounts ({activeAccounts.length})</span>
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions Card */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Recent Transactions
              </CardTitle>
              <CardDescription>
                Latest inflows, outflows, and transfers
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
              <Link href="/transactions">
                <span>View Ledger</span>
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Receipt className="mx-auto h-8 w-8 opacity-40 mb-2" />
                <p className="text-sm">No transactions recorded yet</p>
                <div className="mt-3">
                  <CreateTransactionDialog
                    accounts={accounts}
                    categories={categories}
                  />
                </div>
              </div>
            ) : (
              <>
                {recentTransactions.slice(0, 5).map((txn) => {
                  const isPositive = txn.transaction_type === "income";
                  const isNegative = txn.transaction_type === "expense";

                  return (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isPositive
                              ? "bg-emerald-500/10 text-emerald-600"
                              : isNegative
                              ? "bg-rose-500/10 text-rose-600"
                              : "bg-blue-500/10 text-blue-600"
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : isNegative ? (
                            <TrendingDown className="h-4 w-4" />
                          ) : (
                            <ArrowLeftRight className="h-4 w-4" />
                          )}
                        </div>

                        <div>
                          <p className="font-semibold text-sm leading-tight">
                            {txn.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(txn.transaction_date), "dd MMM")} •{" "}
                            {txn.category?.name || "General"}
                          </p>
                        </div>
                      </div>

                      <MoneyDisplay
                        amount={txn.amount}
                        currency={txn.currency}
                        positiveSign={isPositive}
                        colored={isPositive || isNegative}
                        className={`text-sm font-bold ${
                          isNegative ? "text-rose-600 dark:text-rose-400" : ""
                        }`}
                      />
                    </div>
                  );
                })}

                <div className="pt-2 text-center">
                  <Button asChild variant="outline" size="sm" className="w-full text-xs">
                    <Link href="/transactions">
                      <span>Complete Transaction History</span>
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Recurring Bills Widget */}
      {upcomingRecurring.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Upcoming Bills & Payments</span>
                </CardTitle>
                <CardDescription>
                  Recurring subscriptions due in the next 30 days
                </CardDescription>
              </div>
              <Button asChild variant="link" className="text-xs">
                <Link href="/recurring">Manage All →</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingRecurring.slice(0, 3).map((bill) => (
                <div
                  key={bill.id}
                  className="p-3 rounded-lg border bg-card/60 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-sm">{bill.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due {format(new Date(bill.next_occurrence_date), "dd MMM")}
                    </p>
                  </div>
                  <MoneyDisplay
                    amount={bill.amount}
                    currency={bill.currency}
                    className="font-bold text-sm"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
