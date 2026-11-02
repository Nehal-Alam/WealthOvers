import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { InsightsView } from "@/components/insights/insights-view";

export const metadata: Metadata = {
  title: "Financial Insights — WealthOvers",
  description: "Advanced analytics, cash flow trends, daily spending scrubber, and anomaly detection",
};

export default async function InsightsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Parallelize queries across transactions, accounts, and categories
  const [transactionsResult, accountsResult, categoriesResult] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        `
        id, amount, currency, transaction_type, transaction_date, description, category_id, account_id,
        account:accounts!transactions_account_id_fkey(id, name, institution_name),
        category:categories(id, name, color, icon),
        subcategory:subcategories(id, name)
      `
      )
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .limit(3000),

    supabase
      .from("accounts")
      .select("id, name, color, institution_name, currency, current_balance, account_type, is_archived")
      .eq("user_id", user.id),

    supabase
      .from("categories")
      .select("id, name, color, icon")
      .eq("user_id", user.id),
  ]);

  const transactions = (transactionsResult.data || []) as any[];
  const accounts = (accountsResult.data || []) as Tables<"accounts">[];
  const categories = (categoriesResult.data || []) as Tables<"categories">[];

  return (
    <div className="space-y-6">
      <InsightsView
        transactions={transactions}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}

