import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { addMoney } from "@/lib/calculations/financial";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch user accounts
  const { data: accountsData } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const accounts = (accountsData as Tables<"accounts">[] | null) || [];

  // 2. Fetch categories
  const { data: categoriesData } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  const categories = (categoriesData as Tables<"categories">[] | null) || [];

  // 3. Fetch recent transactions with related category & accounts
  const { data: transactionsData } = await supabase
    .from("transactions")
    .select(
      `
      *,
      account:accounts!transactions_account_id_fkey(id, name, color),
      category:categories(id, name, color, icon)
    `
    )
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .limit(10);

  const recentTransactions = (transactionsData as any[] | null) || [];

  // 4. Fetch current active budget (if any)
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  const { data: activeBudgets } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", user.id)
    .lte("start_date", todayStr)
    .gte("end_date", todayStr)
    .order("created_at", { ascending: false })
    .limit(1);

  let activeBudget: any = null;
  if (activeBudgets && activeBudgets.length > 0) {
    const b = activeBudgets[0];
    const { data: txns } = await supabase
      .from("transactions")
      .select("amount, transaction_type")
      .eq("user_id", user.id)
      .eq("transaction_type", "expense")
      .gte("transaction_date", b.start_date)
      .lte("transaction_date", `${b.end_date}T23:59:59.999Z`);

    let totalSpent = "0.0000";
    if (txns) {
      for (const t of txns) {
        totalSpent = addMoney(totalSpent, t.amount);
      }
    }

    activeBudget = {
      ...b,
      totalSpent,
    };
  }

  // 5. Fetch upcoming recurring rules
  const { data: recurringData } = await supabase
    .from("recurring_transactions")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .gte("next_occurrence_date", todayStr)
    .order("next_occurrence_date", { ascending: true })
    .limit(4);

  const upcomingRecurring = (recurringData as any[] | null) || [];

  return (
    <div className="space-y-6">
      <DashboardClient
        accounts={accounts}
        recentTransactions={recentTransactions}
        categories={categories}
        activeBudget={activeBudget}
        upcomingRecurring={upcomingRecurring}
      />
    </div>
  );
}
