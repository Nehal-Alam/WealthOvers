import React from "react";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { addMoney, calculateSavingsRate } from "@/lib/calculations/financial";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  // Execute ALL initial data queries concurrently in parallel (eliminating waterfall)
  const [
    profileResult,
    accountsResult,
    categoriesResult,
    transactionsResult,
    activeBudgetsResult,
    recurringResult,
    investmentsResult,
    assetsResult,
    loansResult,
    liabilitiesResult,
    goalsResult,
    monthTransactionsResult,
    summaryRpcResult,
    creditCardsResult,
  ] = await Promise.all([
    // 1. User Profile
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),

    // 2. Accounts with explicit fields
    supabase
      .from("accounts")
      .select("id, name, color, account_type, current_balance, currency, institution_name, account_number_masked, is_archived, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    // 3. Categories with explicit fields
    supabase
      .from("categories")
      .select("id, name, color, icon")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),

    // 4. 10 Recent transactions with related account and category
    supabase
      .from("transactions")
      .select(
        `
        id, amount, currency, transaction_type, transaction_date, description, category_id, account_id,
        account:accounts!transactions_account_id_fkey(id, name, color),
        category:categories(id, name, color, icon)
      `
      )
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .limit(10),

    // 5. Current active budget (if any)
    supabase
      .from("budgets")
      .select("id, name, total_amount, start_date, end_date, created_at")
      .eq("user_id", user.id)
      .lte("start_date", todayStr)
      .gte("end_date", todayStr)
      .order("created_at", { ascending: false })
      .limit(1),

    // 6. Upcoming recurring rules
    supabase
      .from("recurring_transactions")
      .select("id, name, amount, currency, next_occurrence_date, recurrence_interval, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .gte("next_occurrence_date", todayStr)
      .order("next_occurrence_date", { ascending: true })
      .limit(4),

    // 7. Investments
    supabase
      .from("investments")
      .select("id, name, symbol, asset_type, broker_name, total_quantity, average_buy_price, current_nav_or_price, current_valuation, currency")
      .eq("user_id", user.id)
      .limit(6),

    // 8. Fixed Assets
    supabase
      .from("assets")
      .select("id, name, category, current_valuation")
      .eq("user_id", user.id),

    // 9. Loans
    supabase
      .from("loans")
      .select("id, lender_or_borrower_name, loan_type, outstanding_balance, monthly_emi, annual_interest_rate")
      .eq("user_id", user.id),

    // 10. External Liabilities
    supabase
      .from("liabilities")
      .select("id, name, category, outstanding_amount, due_date")
      .eq("user_id", user.id),

    // 11. Financial Goals
    supabase
      .from("financial_goals")
      .select("id, name, target_amount, current_amount, target_date, category")
      .eq("user_id", user.id)
      .order("target_date", { ascending: true })
      .limit(4),

    // 12. Month Transactions for Category Expense Breakdown & Deterministic Insights
    supabase
      .from("transactions")
      .select(
        `
        id, amount, currency, transaction_type, transaction_date, description, category_id,
        category:categories(id, name, color, icon)
      `
      )
      .eq("user_id", user.id)
      .gte("transaction_date", monthStart)
      .lte("transaction_date", monthEnd)
      .order("transaction_date", { ascending: false }),

    // 13. Fast Server-side SQL Aggregation RPC
    supabase.rpc("get_dashboard_summary", {
      p_user_id: user.id,
      p_start_date: monthStart,
      p_end_date: monthEnd,
    }),

    // 14. Credit Cards
    supabase
      .from("credit_cards")
      .select("id, account_id, card_name, issuer_name, last_four_digits, credit_limit, current_outstanding, payment_due_day, statement_date_day")
      .eq("user_id", user.id),
  ]);

  const profile = profileResult.data;
  const userName = profile?.full_name?.split(" ")[0] || user.user_metadata?.full_name?.split(" ")[0] || "Investor";

  const accounts = (accountsResult.data as Tables<"accounts">[] | null) || [];
  const categories = (categoriesResult.data as Tables<"categories">[] | null) || [];
  const recentTransactions = (transactionsResult.data as any[] | null) || [];
  const upcomingRecurring = (recurringResult.data as any[] | null) || [];
  const investments = (investmentsResult.data as any[] | null) || [];
  const assets = (assetsResult.data as any[] | null) || [];
  const loans = (loansResult.data as any[] | null) || [];
  const liabilities = (liabilitiesResult.data as any[] | null) || [];
  const goals = (goalsResult.data as any[] | null) || [];
  const monthTransactions = (monthTransactionsResult.data as any[] | null) || [];
  const creditCards = (creditCardsResult.data as any[] | null) || [];

  // Parse active budget spend
  let activeBudget: any = null;
  const activeBudgets = activeBudgetsResult.data;
  if (activeBudgets && activeBudgets.length > 0) {
    const b = activeBudgets[0];
    // If budget covers the current month, monthly_outflow from RPC is the exact spend
    let totalSpent = summaryRpcResult.data?.monthly_outflow || "0.0000";

    // If budget dates differ from current month, compute from filtered transactions
    if (b.start_date !== todayStr.slice(0, 7) + "-01") {
      const { data: budgetExpenses } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("transaction_type", "expense")
        .gte("transaction_date", b.start_date)
        .lte("transaction_date", `${b.end_date}T23:59:59.999Z`);

      if (budgetExpenses) {
        totalSpent = "0.0000";
        for (const t of budgetExpenses) {
          totalSpent = addMoney(totalSpent, t.amount);
        }
      }
    }

    activeBudget = {
      ...b,
      totalSpent,
    };
  }

  // Precomputed financial summary from SQL RPC if available
  let precomputedSummary: any = null;
  if (summaryRpcResult.data && !summaryRpcResult.error) {
    const rpc = summaryRpcResult.data;
    const { savingsRatePercent } = calculateSavingsRate(
      rpc.monthly_inflow || "0",
      rpc.monthly_outflow || "0"
    );
    precomputedSummary = {
      totalLiquid: rpc.total_liquid || "0.0000",
      totalCredit: rpc.total_credit || "0.0000",
      netWorth: rpc.net_worth || "0.0000",
      monthlyInflow: rpc.monthly_inflow || "0.0000",
      monthlyOutflow: rpc.monthly_outflow || "0.0000",
      savingsRate: savingsRatePercent,
    };
  }

  return (
    <div className="space-y-6">
      <DashboardClient
        userName={userName}
        accounts={accounts}
        recentTransactions={recentTransactions}
        categories={categories}
        activeBudget={activeBudget}
        upcomingRecurring={upcomingRecurring}
        investments={investments}
        assets={assets}
        loans={loans}
        liabilities={liabilities}
        goals={goals}
        monthTransactions={monthTransactions}
        creditCards={creditCards}
        precomputedSummary={precomputedSummary}
      />
    </div>
  );
}
