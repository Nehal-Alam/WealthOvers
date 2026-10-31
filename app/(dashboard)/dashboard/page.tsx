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
    accountsResult,
    categoriesResult,
    transactionsResult,
    activeBudgetsResult,
    recurringResult,
    summaryRpcResult,
  ] = await Promise.all([
    // 1. Accounts with explicit fields (avoids select *)
    supabase
      .from("accounts")
      .select("id, name, color, account_type, current_balance, currency, institution_name, account_number_masked, is_archived, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    // 2. Categories with explicit fields
    supabase
      .from("categories")
      .select("id, name, color, icon")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),

    // 3. 10 Recent transactions with related account and category
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

    // 4. Current active budget (if any)
    supabase
      .from("budgets")
      .select("id, name, total_amount, start_date, end_date, created_at")
      .eq("user_id", user.id)
      .lte("start_date", todayStr)
      .gte("end_date", todayStr)
      .order("created_at", { ascending: false })
      .limit(1),

    // 5. Upcoming recurring rules
    supabase
      .from("recurring_transactions")
      .select("id, name, amount, currency, next_occurrence_date, recurrence_interval, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .gte("next_occurrence_date", todayStr)
      .order("next_occurrence_date", { ascending: true })
      .limit(4),

    // 6. Fast Server-side SQL Aggregation RPC
    supabase.rpc("get_dashboard_summary", {
      p_user_id: user.id,
      p_start_date: monthStart,
      p_end_date: monthEnd,
    }),
  ]);

  const accounts = (accountsResult.data as Tables<"accounts">[] | null) || [];
  const categories = (categoriesResult.data as Tables<"categories">[] | null) || [];
  const recentTransactions = (transactionsResult.data as any[] | null) || [];
  const upcomingRecurring = (recurringResult.data as any[] | null) || [];

  // Parse active budget spend
  let activeBudget: any = null;
  const activeBudgets = activeBudgetsResult.data;
  if (activeBudgets && activeBudgets.length > 0) {
    const b = activeBudgets[0];
    const { data: budgetExpenses } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("transaction_type", "expense")
      .gte("transaction_date", b.start_date)
      .lte("transaction_date", `${b.end_date}T23:59:59.999Z`);

    let totalSpent = "0.0000";
    if (budgetExpenses) {
      for (const t of budgetExpenses) {
        totalSpent = addMoney(totalSpent, t.amount);
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
        accounts={accounts}
        recentTransactions={recentTransactions}
        categories={categories}
        activeBudget={activeBudget}
        upcomingRecurring={upcomingRecurring}
        precomputedSummary={precomputedSummary}
      />
    </div>
  );
}
